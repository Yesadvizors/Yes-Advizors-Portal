import { Card, Muted } from '../ClientMasterPreview'

/*
 * E · Relationships — DEFERRED in P2.1. Intentionally not queried; shown as an
 * explicit placeholder so it cannot block the other sections. A read view arrives
 * in a later checkpoint.
 */
export default function RelationshipsSection() {
  return (
    <Card title="E · Relationships">
      <Muted>Deferred — the relationships read view is not part of P2.1.</Muted>
    </Card>
  )
}
