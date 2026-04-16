import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── AUTH ──────────────────────────────────────────────────────────────────────
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
};

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// ── CAMPAIGNS ─────────────────────────────────────────────────────────────────
export async function getCampaigns({ status = "active", sort = "newest" } = {}) {
  let q = supabase
    .from("campaigns")
    .select("*, profiles!creator_id(full_name, wallet, is_verified)");

  if (status === "active")         q = q.eq("status", "active");
  else if (status === "completed") q = q.eq("status", "completed");
  else                             q = q.in("status", ["active", "completed", "paused"]); // "all" — never show pending/draft/cancelled

  if (sort === "most_raised")
    q = q.order("raised_sol", { ascending: false });
  else if (sort === "ending_soon")
    q = q.not("end_date", "is", null).order("end_date", { ascending: true });
  else
    q = q.order("created_at", { ascending: false }); // newest / most_funded (client-side)

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

export async function getFeaturedCampaigns() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, profiles!creator_id(full_name, wallet, is_verified)")
    .eq("status", "completed")
    .order("raised_sol", { ascending: false })
    .limit(50);
  if (error) throw error;
  // Filter to 100% funded, sort by highest raised, take top 6
  return (data || [])
    .filter(c => +c.goal_sol > 0 && +c.raised_sol >= +c.goal_sol)
    .slice(0, 6);
}

export async function adminSetFeatured(adminId, campaignId, order, featuredUntil) {
  // Clear any existing campaign in this slot first
  await supabase.from("campaigns")
    .update({ is_featured: false, featured_order: null, featured_until: null })
    .eq("featured_order", order).eq("is_featured", true);
  const { error } = await supabase.from("campaigns")
    .update({ is_featured: true, featured_order: order, featured_until: featuredUntil || null })
    .eq("id", campaignId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "feature_campaign",
    target_type: "campaign", target_id: campaignId, note: `Slot ${order}`,
  });
}

export async function adminUnsetFeatured(adminId, campaignId) {
  const { error } = await supabase.from("campaigns")
    .update({ is_featured: false, featured_order: null, featured_until: null })
    .eq("id", campaignId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "unfeature_campaign",
    target_type: "campaign", target_id: campaignId,
  });
}

export async function getActiveCampaignsByUserIds(userIds) {
  if (!userIds.length) return [];
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, creator_id")
    .in("creator_id", userIds)
    .eq("status", "active");
  if (error) throw error;
  return data || [];
};

export async function getMyCampaigns(userId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export async function createCampaign(payload) {
  const { data, error } = await supabase
    .from("campaigns")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export async function updateCampaign(id, updates) {
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export async function creatorCancelCampaign(campaignId, userId) {
  // Server-side guard: block cancel if M1 reached (raised >= 25% of goal or already claimed)
  const { data: camp } = await supabase
    .from("campaigns")
    .select("raised_sol, goal_sol, milestone_claimed")
    .eq("id", campaignId)
    .eq("creator_id", userId)
    .single();
  if (camp) {
    const raised = +camp.raised_sol || 0;
    const goal   = +camp.goal_sol   || 0;
    if (camp.milestone_claimed >= 1 || (goal > 0 && raised >= goal / 4)) {
      throw new Error("Cannot cancel: campaign has reached M1 (25% of goal). Funds are locked in escrow.");
    }
  }
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "cancelled" })
    .eq("id", campaignId)
    .eq("creator_id", userId)
    .in("status", ["active", "pending", "paused", "draft"]);
  if (error) throw error;
}

export async function creatorPauseCampaign(campaignId, userId) {
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("id", campaignId)
    .eq("creator_id", userId)
    .in("status", ["active"]);
  if (error) throw error;
}

// Used to roll back a newly-created campaign if escrow init fails
export async function deleteNewCampaign(id, userId) {
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("creator_id", userId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function deleteCampaign(id) {
  const { error } = await supabase.rpc("admin_delete_campaign", { p_campaign_id: id });
  if (error) throw error;
};

// ── CONTRIBUTIONS ─────────────────────────────────────────────────────────────
export async function recordContribution(payload) {
  const { data, error } = await supabase
    .from("contributions")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export async function getCampaignContributions(campaignId) {
  // Fetch campaign's approved_at so we only show contributions after launch
  const { data: camp } = await supabase
    .from("campaigns")
    .select("approved_at")
    .eq("id", campaignId)
    .single();

  let query = supabase
    .from("contributions")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (camp?.approved_at) {
    query = query.gte("created_at", camp.approved_at);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// ── PROFILE ───────────────────────────────────────────────────────────────────
export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { data: profile, error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select()
    .single();
  if (dbErr) throw dbErr;
  return profile;
};

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── STATS ─────────────────────────────────────────────────────────────────────
export async function getPlatformStats() {
  const { data, error } = await supabase
    .from("platform_stats")
    .select("*")
    .single();
  if (error) return { active_campaigns: 0, total_users: 0, total_sol_raised: 0, total_contributions: 0 };
  return data;
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export async function adminGetAllCampaigns() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, profiles!creator_id(full_name, email, wallet, is_verified)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export async function adminApproveCampaign(adminId, campaignId) {
  // Fetch campaign first so we can notify the creator
  const { data: camp } = await supabase
    .from("campaigns")
    .select("creator_id, title")
    .eq("id", campaignId)
    .single();

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "active", reject_reason: null, approved_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (error) throw error;

  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "approve",
    target_type: "campaign", target_id: campaignId,
  });

  // Notify creator
  if (camp?.creator_id) {
    await supabase.from("notifications").insert({
      user_id:  camp.creator_id,
      type:     "campaign_approved",
      title:    "🎉 Campaign Approved!",
      message:  `Your campaign "${camp.title}" has been approved and is now live on FundBeep. Share it with the world!`,
      metadata: { campaign_id: campaignId, campaign_title: camp.title },
    });
  }
};

export async function adminRejectCampaign(adminId, campaignId, reason) {
  const { data: camp } = await supabase
    .from("campaigns")
    .select("creator_id, title")
    .eq("id", campaignId)
    .single();

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "rejected", reject_reason: reason })
    .eq("id", campaignId);
  if (error) throw error;

  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "reject",
    target_type: "campaign", target_id: campaignId,
    note: reason,
  });

  if (camp?.creator_id) {
    await supabase.from("notifications").insert({
      user_id:  camp.creator_id,
      type:     "campaign_rejected",
      title:    "Campaign Update",
      message:  `Your campaign "${camp.title}" was not approved${reason ? `: ${reason}` : ". Please review and resubmit."}`,
      metadata: { campaign_id: campaignId, campaign_title: camp.title },
    });
  }
};

export async function adminPauseCampaign(adminId, campaignId) {
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("id", campaignId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "pause",
    target_type: "campaign", target_id: campaignId,
  });
};

export async function adminGetAllUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

/** Admin: get all users who have created campaigns, grouped with their campaign list */
export async function adminGetAllCreators() {
  const { data: camps } = await supabase
    .from("campaigns")
    .select("id, title, goal_sol, raised_sol, status, created_at, contributor_count, creator_id, image_emoji")
    .order("created_at", { ascending: false });
  if (!camps?.length) return [];
  const creatorIds = [...new Set(camps.map(c => c.creator_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", creatorIds);
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  const creatorMap = new Map();
  for (const c of camps) {
    if (!c.creator_id) continue;
    const prof = profileMap.get(c.creator_id);
    if (!creatorMap.has(c.creator_id)) {
      creatorMap.set(c.creator_id, { ...(prof || { id: c.creator_id }), campaigns: [] });
    }
    creatorMap.get(c.creator_id).campaigns.push(c);
  }
  return Array.from(creatorMap.values());
}

/** Admin: get all confirmed contributions across all campaigns (max 500) */
export async function adminGetAllContributions() {
  const { data, error } = await supabase
    .from("contributions")
    .select("id, amount_sol, tx_signature, wallet_from, created_at, status, campaign_id, campaigns(id, title, image_emoji)")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

export async function adminVerifyUser(adminId, userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_verified: true })
    .eq("id", userId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "verify_user",
    target_type: "user", target_id: userId,
  });
};

/** Directly grant badge to any user for N days (no payment required) */
export async function adminGrantBadge(adminId, userId, days = 30) {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ is_verified: true, badge_expires_at: expiresAt })
    .eq("id", userId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "grant_badge",
    target_type: "user", target_id: userId,
    note: `${days} days`,
  });
}

/** Revoke badge from a user */
export async function adminRevokeBadge(adminId, userId) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_verified: false, badge_expires_at: null })
    .eq("id", userId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "revoke_badge",
    target_type: "user", target_id: userId,
  });
}

/** Set a user's monthly free post override (null = use dynamic formula) */
export async function adminSetPostLimit(adminId, userId, limit) {
  const val = limit === null || limit === "" ? null : parseInt(limit, 10);
  const { error } = await supabase
    .from("profiles")
    .update({ free_posts_override: val })
    .eq("id", userId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "set_post_limit",
    target_type: "user", target_id: userId,
    note: val === null ? "reset to dynamic" : `${val}/month`,
  });
}

/** Admin-boost any campaign directly (bypasses creator_id check) */
export async function adminBoostCampaign(adminId, campaignId, durationHours) {
  const boostedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("campaigns")
    .update({ is_boosted: true, boosted_until: boostedUntil })
    .eq("id", campaignId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "admin_boost",
    target_type: "campaign", target_id: campaignId,
    note: `${durationHours}h`,
  });
}

/** Fetch currently active boosted campaigns for the Explore feed */
export async function getBoostedCampaigns() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, profiles!creator_id(full_name, wallet, is_verified)")
    .eq("status", "active")
    .eq("is_boosted", true)
    .gt("boosted_until", new Date().toISOString())
    .order("boosted_until", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

/** Stop a campaign boost */
export async function adminUnboostCampaign(adminId, campaignId) {
  const { error } = await supabase
    .from("campaigns")
    .update({ is_boosted: false, boosted_until: null })
    .eq("id", campaignId);
  if (error) throw error;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "admin_unboost",
    target_type: "campaign", target_id: campaignId,
  });
}

export async function getAdminLogs() {
  const { data, error } = await supabase
    .from("admin_logs")
    .select("*, profiles!admin_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};

export async function getCampaign(id) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, profiles!creator_id(full_name, wallet, is_verified, wallet_verified, email)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

// ── STORAGE — Campaign Images ──────────────────────────────────────────────
export async function uploadCampaignImage(file, userId) {
  const ext  = file.name.split(".").pop().toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("campaign-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("campaign-images").getPublicUrl(path);
  return data.publicUrl;
}

// ── PROFILE USERNAME ──────────────────────────────────────────────────────────
export async function updateUsername(userId, fullName) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── PLATFORM SETTINGS ─────────────────────────────────────────────────────────
export async function getPlatformSetting(key) {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .single();
  if (error) return null;
  return data?.value;
}

export async function setPlatformSetting(key, value) {
  const { error } = await supabase
    .from("platform_settings")
    .upsert({ key, value: String(value) });
  if (error) throw error;
}

// ── FEATURE REQUESTS ──────────────────────────────────────────────────────────

export async function submitFeatureRequest(userId, campaignId, txSignature, amountSol) {
  const { data, error } = await supabase
    .from("feature_requests")
    .insert({ user_id: userId, campaign_id: campaignId, tx_signature: txSignature, amount_sol: amountSol })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyFeatureRequests(userId) {
  const { data, error } = await supabase
    .from("feature_requests")
    .select("*, campaigns(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminGetFeatureRequests() {
  const { data, error } = await supabase
    .from("feature_requests")
    .select("*, campaigns(title), profiles!user_id(full_name, wallet, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminApproveFeatureRequest(adminId, requestId, campaignId, slot = 1) {
  await adminSetFeatured(adminId, campaignId, slot, null);
  const { error } = await supabase
    .from("feature_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", requestId);
  if (error) throw error;
}

export async function adminRejectFeatureRequest(adminId, requestId, note) {
  const { error } = await supabase
    .from("feature_requests")
    .update({ status: "rejected", note, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", requestId);
  if (error) throw error;
}

// ── BADGE REQUESTS ────────────────────────────────────────────────────────────
export async function submitBadgeRequest(userId, txSignature, amountSol) {
  const { data, error } = await supabase
    .from("badge_requests")
    .insert({ user_id: userId, tx_signature: txSignature, amount_sol: amountSol })
    .select()
    .single();
  if (error) throw error;
  // Mark profile with pending tx
  await supabase.from("profiles").update({ badge_tx: txSignature }).eq("id", userId);
  return data;
}

export async function getMyBadgeRequests(userId) {
  const { data, error } = await supabase
    .from("badge_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminGetBadgeRequests() {
  const { data, error } = await supabase
    .from("badge_requests")
    .select("*, profiles!user_id(full_name, wallet, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminApproveBadge(adminId, requestId, userId) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  // Update request
  const { error: e1 } = await supabase
    .from("badge_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", requestId);
  if (e1) throw e1;
  // Grant badge to user for 30 days
  const { error: e2 } = await supabase
    .from("profiles")
    .update({ is_verified: true, badge_expires_at: expiresAt })
    .eq("id", userId);
  if (e2) throw e2;
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "approve_badge",
    target_type: "badge_request", target_id: requestId,
  });
}

export async function adminRejectBadge(adminId, requestId, userId, note) {
  const { error: e1 } = await supabase
    .from("badge_requests")
    .update({ status: "rejected", note, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", requestId);
  if (e1) throw e1;
  // Remove any pending badge tx from profile
  await supabase.from("profiles").update({ badge_tx: "" }).eq("id", userId);
  await supabase.from("admin_logs").insert({
    admin_id: adminId, action: "reject_badge",
    target_type: "badge_request", target_id: requestId, note,
  });
}

// ── FOLLOWS ───────────────────────────────────────────────────────────────────

export async function followCampaign(userId, campaignId) {
  const { error } = await supabase.from("campaign_follows").insert({ follower_id: userId, campaign_id: campaignId });
  if (error && !error.code?.includes("23505")) throw error;
}
export async function unfollowCampaign(userId, campaignId) {
  const { error } = await supabase.from("campaign_follows").delete().eq("follower_id", userId).eq("campaign_id", campaignId);
  if (error) throw error;
}
export async function getCampaignFollowState(userId, campaignId) {
  const [{ count }, { data }] = await Promise.all([
    supabase.from("campaign_follows").select("*", { count: "exact", head: true }).eq("campaign_id", campaignId),
    userId ? supabase.from("campaign_follows").select("follower_id").eq("follower_id", userId).eq("campaign_id", campaignId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { count: count || 0, isFollowing: !!data };
}

export async function followCreator(userId, creatorId) {
  const { error } = await supabase.from("creator_follows").insert({ follower_id: userId, creator_id: creatorId });
  if (error && !error.code?.includes("23505")) throw error;
}
export async function unfollowCreator(userId, creatorId) {
  const { error } = await supabase.from("creator_follows").delete().eq("follower_id", userId).eq("creator_id", creatorId);
  if (error) throw error;
}
export async function getCreatorFollowState(userId, creatorId) {
  const [{ count }, { data }] = await Promise.all([
    supabase.from("creator_follows").select("*", { count: "exact", head: true }).eq("creator_id", creatorId),
    userId ? supabase.from("creator_follows").select("follower_id").eq("follower_id", userId).eq("creator_id", creatorId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { count: count || 0, isFollowing: !!data };
}

/** All campaigns + creators a user follows */
export async function getUserFollowing(userId) {
  const [camps, creators] = await Promise.all([
    supabase.from("campaign_follows")
      .select("campaign_id, created_at, campaigns(id, title, image_url, image_emoji, raised_sol, goal_sol, status, category)")
      .eq("follower_id", userId).order("created_at", { ascending: false }),
    supabase.from("creator_follows")
      .select("creator_id, created_at, profiles!creator_id(id, full_name, username, wallet, is_verified)")
      .eq("follower_id", userId).order("created_at", { ascending: false }),
  ]);
  return { campaigns: camps.data || [], creators: creators.data || [] };
}

/** IDs of creators a user already follows (for bulk check in feed) */
export async function getFollowedCreatorIds(userId) {
  const { data } = await supabase.from("creator_follows").select("creator_id").eq("follower_id", userId);
  return new Set((data || []).map(r => r.creator_id));
}

// ── LIVE FEED ─────────────────────────────────────────────────────────────────

/** All contributions by a specific user, with campaign details */
export async function getMyContributedCampaigns(userId) {
  const { data, error } = await supabase
    .from("contributions")
    .select("id, amount_sol, created_at, campaign_id, campaigns(id, title, goal_sol, raised_sol, status, end_date, image_url, image_emoji, contract_pda, milestone_claimed, approved_at)")
    .eq("contributor_id", userId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Aggregate by campaign
  const map = new Map();
  for (const row of data || []) {
    const c = row.campaigns;
    if (!c) continue;
    if (!map.has(row.campaign_id)) {
      map.set(row.campaign_id, { ...c, my_total_sol: 0, last_contributed_at: row.created_at });
    }
    map.get(row.campaign_id).my_total_sol += Number(row.amount_sol);
  }
  return Array.from(map.values());
}

/** Most recent contributions across all campaigns (with campaign title) */
export async function getRecentContributions(limit = 8) {
  const { data, error } = await supabase
    .from("contributions")
    .select("id, amount_sol, wallet_from, created_at, campaigns(id, title)")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ── CONTRIBUTOR BADGES ────────────────────────────────────────────────────────

/** Award a badge — silently ignores duplicates (unique constraint) */
export async function awardContributorBadge(userId, campaignId, badgeType) {
  const { error } = await supabase
    .from("contributor_badges")
    .insert({ user_id: userId, campaign_id: campaignId, badge_type: badgeType });
  if (error && !error.message?.includes("duplicate") && !error.code?.includes("23505")) throw error;
}

/** All badges earned by a user (with campaign title) */
export async function getUserBadges(userId) {
  const { data, error } = await supabase
    .from("contributor_badges")
    .select("*, campaigns(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Badges for all contributors on a campaign (for contribution row display) */
export async function getCampaignContributorBadges(campaignId) {
  const { data, error } = await supabase
    .from("contributor_badges")
    .select("user_id, badge_type")
    .eq("campaign_id", campaignId);
  if (error) throw error;
  // Return a map: userId → badge_type[]
  const map = {};
  (data || []).forEach(({ user_id, badge_type }) => {
    if (!map[user_id]) map[user_id] = [];
    map[user_id].push(badge_type);
  });
  return map;
}

// ── ON-CHAIN WALLET VERIFICATION ──────────────────────────────────────────────

/** Mark a user's wallet as cryptographically verified */
export async function markWalletVerified(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ wallet_verified: true, wallet_verified_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── CAMPAIGN COMMENTS ─────────────────────────────────────────────────────────

export async function getCampaignComments(campaignId) {
  const { data, error } = await supabase
    .from("campaign_comments")
    .select("*, profiles!user_id(id, full_name, username, wallet, is_verified, wallet_verified)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addCampaignComment(campaignId, userId, content) {
  const { data, error } = await supabase
    .from("campaign_comments")
    .insert({ campaign_id: campaignId, user_id: userId, content: content.trim() })
    .select("*, profiles!user_id(id, full_name, username, wallet, is_verified, wallet_verified)")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaignComment(commentId, userId) {
  const { error } = await supabase
    .from("campaign_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── PROOF OF USE ──────────────────────────────────────────────────────────────

export async function getProofOfUse(campaignId) {
  const { data, error } = await supabase
    .from("proof_of_use")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addProofOfUse(campaignId, creatorId, txSignature, amountSol, description) {
  const { data, error } = await supabase
    .from("proof_of_use")
    .insert({ campaign_id: campaignId, creator_id: creatorId, tx_signature: txSignature, amount_sol: amountSol || null, description: description.trim(), source: "manual", status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Auto-insert an outgoing tx detected from wallet scan */
export async function autoAddProofOfUse(campaignId, creatorId, txSignature, amountSol, walletTo, txTimestamp) {
  const { data, error } = await supabase
    .from("proof_of_use")
    .insert({ campaign_id: campaignId, creator_id: creatorId, tx_signature: txSignature, amount_sol: amountSol || null, description: "", source: "auto", status: "pending", wallet_to: walletTo || null, tx_timestamp: txTimestamp || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Creator adds/edits reason on a pending proof */
export async function updateProofDescription(id, creatorId, description) {
  const { data, error } = await supabase
    .from("proof_of_use")
    .update({ description: description.trim() })
    .eq("id", id)
    .eq("creator_id", creatorId)
    .eq("status", "pending")
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Creator declares a proof — locks it permanently */
export async function declareProof(id, creatorId) {
  const { data, error } = await supabase
    .from("proof_of_use")
    .update({ status: "declared", declared_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_id", creatorId)
    .eq("status", "pending")
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Superadmin deletes any proof including declared ones */
export async function adminDeleteProofOfUse(id) {
  const { error } = await supabase.from("proof_of_use").delete().eq("id", id);
  if (error) throw error;
}

/** Creator deletes their own pending (non-declared) proof */
export async function deleteProofOfUse(id, creatorId) {
  const { error } = await supabase.from("proof_of_use").delete().eq("id", id).eq("creator_id", creatorId);
  if (error) throw error;
}

// ── CAMPAIGN UPDATES ──────────────────────────────────────────────────────────

/** Fetch all updates for a campaign, newest first */
export async function getCampaignUpdates(campaignId) {
  const { data, error } = await supabase
    .from("campaign_updates")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Creator posts a new update */
export async function postCampaignUpdate(campaignId, creatorId, title, content) {
  const { data, error } = await supabase
    .from("campaign_updates")
    .insert({ campaign_id: campaignId, creator_id: creatorId, title: title.trim(), content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Creator deletes one of their updates */
export async function deleteCampaignUpdate(updateId, creatorId) {
  const { error } = await supabase
    .from("campaign_updates")
    .delete()
    .eq("id", updateId)
    .eq("creator_id", creatorId);
  if (error) throw error;
}

// ── EXPLORE / SOCIAL FEED ─────────────────────────────────────────────────────

const FREE_POSTS_PER_MONTH = 10;

/**
 * Dynamic free post limit for a user:
 * - Base: 10/month
 * - Account age > 1 year: base becomes 30
 * - +1/month per SOL raised in completed campaigns
 */
export async function getUserFreePostLimit(userId) {
  const [{ data: profile }, { data: campaigns }] = await Promise.all([
    supabase.from("profiles").select("created_at, free_posts_override").eq("id", userId).single(),
    supabase.from("campaigns").select("raised_sol").eq("creator_id", userId).eq("status", "completed"),
  ]);
  // Admin override takes priority
  if (profile?.free_posts_override != null) return profile.free_posts_override;
  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const base = createdAt <= oneYearAgo ? 30 : 10;
  const bonus = (campaigns || []).reduce((sum, c) => sum + Math.floor(c.raised_sol || 0), 0);
  return base + bonus;
}

/** How many posts this user has made in the current calendar month */
export async function getMonthlyPostCount(userId) {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  return count || 0;
}

/** Get user's extra-post point balance */
export async function getPostPointBalance(userId) {
  const { data } = await supabase
    .from("post_points")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance || 0;
}

/** Fetch paginated public feed with profile join */
export async function getPosts({ page = 0, limit = 20 } = {}) {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles!user_id(id, full_name, username, wallet, avatar_url, is_verified, wallet_verified)")
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  if (error) throw error;
  return data || [];
}

/** Fetch replies for a post */
export async function getPostReplies(postId) {
  const { data, error } = await supabase
    .from("post_replies")
    .select("*, profiles!user_id(id, full_name, username, wallet, avatar_url, is_verified, wallet_verified)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Fetch which post IDs the current user has liked (from a list) */
export async function getMyLikes(userId, postIds) {
  if (!postIds.length) return [];
  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return (data || []).map(r => r.post_id);
}

/**
 * Create a new post.
 * Checks monthly quota (20 free) then point balance before inserting.
 */
export async function createPost(userId, content) {
  // 1. Check monthly free quota (dynamic limit)
  const [monthCount, freeLimit] = await Promise.all([
    getMonthlyPostCount(userId),
    getUserFreePostLimit(userId),
  ]);
  if (monthCount < freeLimit) {
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: userId, content: content.trim() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  // 2. Quota exceeded — deduct 1 point
  const balance = await getPostPointBalance(userId);
  if (balance < 1) throw new Error("NO_POINTS");
  // Deduct point
  await supabase
    .from("post_points")
    .update({ balance: balance - 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  // Insert post
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete own post */
export async function deletePost(postId, userId) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Toggle like on a post */
export async function toggleLike(userId, postId, isLiked) {
  if (isLiked) {
    await supabase.from("post_likes").delete()
      .eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  }
  // like_count is maintained automatically by the trg_sync_like_count DB trigger
}

/** Add a reply */
export async function addReply(userId, postId, content) {
  const { data, error } = await supabase
    .from("post_replies")
    .insert({ post_id: postId, user_id: userId, content: content.trim() })
    .select("*, profiles!user_id(id, full_name, username, wallet, is_verified)")
    .single();
  if (error) throw error;
  // reply_count is maintained automatically by the trg_sync_reply_count DB trigger
  return data;
}

/**
 * Buy extra post points with SOL.
 * qty = number of points to purchase.
 * txSignature = on-chain tx already sent by caller.
 */
export async function buyPostPoints(userId, qty, amountSol, txSignature) {
  // Log the purchase
  await supabase.from("points_purchases").insert({
    user_id: userId, points: qty,
    amount_sol: amountSol, tx_signature: txSignature,
  });
  // Upsert the balance
  const balance = await getPostPointBalance(userId);
  await supabase.from("post_points").upsert({
    user_id: userId,
    balance: balance + qty,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

/** Get points purchase history for a user */
export async function getPointsPurchases(userId) {
  const { data } = await supabase
    .from("points_purchases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

// ── CAMPAIGN BOOST ─────────────────────────────────────────────────────────────

/**
 * After the creator has paid the boost fee on-chain, call this to
 * activate the boost for `durationHours` (24 or 48).
 */
export async function boostCampaign(campaignId, userId, durationHours) {
  const boostedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("campaigns")
    .update({ is_boosted: true, boosted_until: boostedUntil })
    .eq("id", campaignId)
    .eq("creator_id", userId);
  if (error) throw error;
}

// ── IMPACT REPORTS ─────────────────────────────────────────────────────────────

export async function getImpactReport(campaignId) {
  const { data, error } = await supabase
    .from("impact_reports")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function submitImpactReport(campaignId, creatorId, { title, content, photos, receipts }) {
  const { data, error } = await supabase
    .from("impact_reports")
    .insert({ campaign_id: campaignId, creator_id: creatorId, title: title.trim(), content: content.trim(), photos: photos || [], receipts: receipts || [] })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateImpactReport(id, creatorId, { title, content, photos, receipts }) {
  const { data, error } = await supabase
    .from("impact_reports")
    .update({ title: title.trim(), content: content.trim(), photos: photos || [], receipts: receipts || [], updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_id", creatorId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── PUBLIC PROFILES & LEADERBOARD ─────────────────────────────────────────────

/** Fetch public profile fields for any user */
export async function getPublicProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio_short, bio_long, twitter, facebook, telegram, date_of_birth, created_at, is_verified, badge_expires_at, wallet_verified")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

/** All-time total SOL contributed by a user */
export async function getUserTotalContributed(userId) {
  const { data, error } = await supabase.rpc("get_user_total_contributed", { p_user_id: userId });
  if (error) throw error;
  return data || 0;
}

/** All-time contribution count for a user */
export async function getUserContributionCount(userId) {
  const { data, error } = await supabase.rpc("get_user_contribution_count", { p_user_id: userId });
  if (error) throw error;
  return data || 0;
}

/** Top N contributors for a given month/year */
export async function getMonthlyTopContributors(year, month, limit = 5) {
  const { data, error } = await supabase.rpc("get_monthly_top_contributors", {
    p_year: year, p_month: month, p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

/** Leaderboard wins for a specific user */
export async function getUserLeaderboardWins(userId) {
  const { data, error } = await supabase
    .from("leaderboard_wins")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** All leaderboard wins for a past month (for history display) */
export async function getMonthLeaderboardWins(year, month) {
  const { data, error } = await supabase
    .from("leaderboard_wins")
    .select("*, profiles!user_id(id, full_name, username, is_verified, badge_expires_at)")
    .eq("year", year)
    .eq("month", month)
    .order("rank", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Record top contributors for a past month into leaderboard_wins.
 * Uses ON CONFLICT DO NOTHING so it's safe to call multiple times.
 */
export async function recordMonthLeaderboard(year, month) {
  const top = await getMonthlyTopContributors(year, month, 5);
  if (!top.length) return;
  const rows = top.map((u, i) => ({
    user_id: u.user_id,
    year,
    month,
    rank: i + 1,
    total_sol: u.total_sol,
  }));
  const { error } = await supabase
    .from("leaderboard_wins")
    .upsert(rows, { onConflict: "user_id,year,month", ignoreDuplicates: true });
  if (error) throw error;
}

/** Campaigns created by a user (public: active, paused, or completed) */
export async function getUserCampaigns(userId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, status, raised_sol, goal_sol, image_url, image_emoji, created_at")
    .eq("creator_id", userId)
    .in("status", ["active", "paused", "completed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Follow stats for a profile: follower count, following count, and whether viewerId follows them */
export async function getProfileFollowStats(profileUserId, viewerId = null) {
  const queries = [
    supabase.from("creator_follows").select("*", { count: "exact", head: true }).eq("creator_id", profileUserId),
    supabase.from("creator_follows").select("*", { count: "exact", head: true }).eq("follower_id", profileUserId),
  ];
  if (viewerId) {
    queries.push(
      supabase.from("creator_follows").select("follower_id").eq("follower_id", viewerId).eq("creator_id", profileUserId).maybeSingle()
    );
  }
  const results = await Promise.all(queries);
  return {
    followersCount: results[0].count || 0,
    followingCount: results[1].count || 0,
    isFollowing: viewerId ? !!results[2]?.data : false,
  };
}

/** Profiles this user is following (creator follows list) */
export async function getUserFollowingList(userId) {
  const { data, error } = await supabase
    .from("creator_follows")
    .select("creator_id, created_at, profiles!creator_id(id, full_name, username, avatar_url, is_verified, badge_expires_at)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Profiles that follow this user */
export async function getUserFollowersList(userId) {
  const { data, error } = await supabase
    .from("creator_follows")
    .select("follower_id, created_at, profiles!follower_id(id, full_name, username, avatar_url, is_verified, badge_expires_at)")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── SCAM REPORTS ──────────────────────────────────────────────────────────────

/** Submit a scam report for a campaign */
export async function submitCampaignReport(reporterId, campaignId, reason, details) {
  const { data, error } = await supabase
    .from("campaign_reports")
    .insert({ reporter_id: reporterId, campaign_id: campaignId, reason, details: details?.trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Check if the current user already reported a campaign */
export async function getMyReport(reporterId, campaignId) {
  const { data } = await supabase
    .from("campaign_reports")
    .select("id, status, reason")
    .eq("reporter_id", reporterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  return data || null;
}

/** Admin: fetch all reports with campaign + reporter info */
export async function adminGetReports(status = "all") {
  let q = supabase
    .from("campaign_reports")
    .select("*, campaigns!campaign_id(id, title, status, creator_id), profiles!reporter_id(id, full_name, username, wallet)")
    .order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Admin: update report status */
export async function adminReviewReport(adminId, reportId, status, adminNote) {
  const { data, error } = await supabase
    .from("campaign_reports")
    .update({ status, admin_note: adminNote?.trim() || null, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", reportId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── KYC / ORG VERIFICATION ────────────────────────────────────────────────────

/** Admin: grant KYC verified badge to a campaign */
export async function adminGrantKyc(adminId, campaignId) {
  const { data, error } = await supabase
    .from("campaigns")
    .update({ kyc_verified: true })
    .eq("id", campaignId)
    .select("id, title, kyc_verified")
    .single();
  if (error) throw error;
  return data;
}

/** Admin: revoke KYC badge from a campaign */
export async function adminRevokeKyc(adminId, campaignId) {
  const { data, error } = await supabase
    .from("campaigns")
    .update({ kyc_verified: false })
    .eq("id", campaignId)
    .select("id, title, kyc_verified")
    .single();
  if (error) throw error;
  return data;
}

/** Admin: grant Organisation verified badge to a campaign */
export async function adminGrantOrg(adminId, campaignId) {
  const { data, error } = await supabase
    .from("campaigns")
    .update({ org_verified: true })
    .eq("id", campaignId)
    .select("id, title, org_verified")
    .single();
  if (error) throw error;
  return data;
}

/** Admin: revoke Organisation badge from a campaign */
export async function adminRevokeOrg(adminId, campaignId) {
  const { data, error } = await supabase
    .from("campaigns")
    .update({ org_verified: false })
    .eq("id", campaignId)
    .select("id, title, org_verified")
    .single();
  if (error) throw error;
  return data;
}

/** Get campaigns owned by a user (for KYC request flow) */
export async function getMyCampaignsForKyc(userId) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, title, status, kyc_verified, org_verified")
    .eq("creator_id", userId)
    .in("status", ["active", "pending", "completed"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── REPUTATION / DID ──────────────────────────────────────────────────────────

/** Compute on-chain reputation score for any user */
export async function getReputationScore(userId) {
  const { data, error } = await supabase.rpc("get_reputation_score", { p_user_id: userId });
  if (error) throw error;
  return data?.[0] || null;
}

// ── ADMIN CAMPAIGN EDIT + MANUAL CONTRIBUTION ─────────────────────────────────

/** Admin: update any campaign field (bypasses RLS via SECURITY DEFINER) */
export async function adminUpdateCampaign(campaignId, fields) {
  const { error } = await supabase.rpc("admin_update_campaign", {
    p_campaign_id: campaignId,
    p_title:       fields.title        ?? "",
    p_description: fields.description  ?? "",
    p_goal_sol:    fields.goal_sol     ?? 0,
    p_category:    fields.category     ?? "",
    p_status:      fields.status       ?? "active",
    p_end_date:    fields.end_date     ?? "",
    p_image_emoji: fields.image_emoji  ?? "",
    p_wallet:      fields.wallet       ?? "",
  });
  if (error) throw error;
}

/** Admin: manually insert a confirmed contribution and bump raised_sol */
export async function adminAddContribution(campaignId, walletFrom, amountSol, note) {
  const { data, error } = await supabase.rpc("admin_add_contribution", {
    p_campaign_id: campaignId,
    p_wallet_from: walletFrom || "",
    p_amount_sol:  amountSol,
    p_note:        note || "",
  });
  if (error) throw error;
  return data;
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export async function getUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("read", false)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function markNotificationRead(id) {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(userId) {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}
