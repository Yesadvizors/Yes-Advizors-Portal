-- ============================================================================
-- ROLLBACK for 0032 — PACKAGE 2 readiness view.
-- Additive read-only object; dropping it removes no data. Target: yav2-dev ONLY.
-- Run only under explicit PJ authorisation for a live change.
-- ============================================================================
drop view if exists public.v_requirement_document_readiness;
