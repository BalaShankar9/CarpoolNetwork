-- Runtime rollback only. Pause new writes and restore the previous Worker first.
-- Keeps all tables, records, ratings, messages and booking history.
DROP TRIGGER IF EXISTS trg_booking_accept_effects;
DROP TRIGGER IF EXISTS trg_booking_block_accept;
DROP TRIGGER IF EXISTS trg_booking_block_insert;
DROP TRIGGER IF EXISTS trg_booking_cancel_effects;
DROP TRIGGER IF EXISTS trg_booking_pending_insert;
DROP TRIGGER IF EXISTS trg_booking_status_history;
DROP TRIGGER IF EXISTS trg_booking_transition;
DROP TRIGGER IF EXISTS trg_chat_member_insert;
DROP TRIGGER IF EXISTS trg_link_message_guard;
DROP TRIGGER IF EXISTS trg_member_overlap_accept;
DROP TRIGGER IF EXISTS trg_new_review_publication;
DROP TRIGGER IF EXISTS trg_pending_capacity_insert;
DROP TRIGGER IF EXISTS trg_pending_capacity_update;
DROP TRIGGER IF EXISTS trg_pending_limit_insert;
DROP TRIGGER IF EXISTS trg_pending_limit_update;
DROP TRIGGER IF EXISTS trg_post_close_pending;
DROP TRIGGER IF EXISTS trg_scoped_post_membership;
