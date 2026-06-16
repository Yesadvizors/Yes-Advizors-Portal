# Package B — POST-DATA rollback
B functions are read-only (no rows written). Even post-data, dropping them is non-destructive to data.
Safe order = reverse dependency (drop readers first, then resolvers, then helpers) exactly as in
04_ROLLBACK_PREDATA.sql. If snapshots created by Package C reference rule outputs, those snapshot
rows are independent and remain intact. None of these functions previously existed (all are NEW in
this package), so there is no prior definition to restore — a clean DROP fully reverts.
