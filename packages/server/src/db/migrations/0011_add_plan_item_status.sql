-- Create plan_item_status enum
CREATE TYPE plan_item_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Add status column to strategies, goals, indicators
ALTER TABLE strategies ADD COLUMN status plan_item_status NOT NULL DEFAULT 'pending';
ALTER TABLE goals ADD COLUMN status plan_item_status NOT NULL DEFAULT 'pending';
ALTER TABLE indicators ADD COLUMN status plan_item_status NOT NULL DEFAULT 'pending';

-- Create plan_status_logs table
CREATE TABLE plan_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  old_status plan_item_status,
  new_status plan_item_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX idx_plan_status_logs_entity ON plan_status_logs(entity_type, entity_id);
CREATE INDEX idx_plan_status_logs_changed_at ON plan_status_logs(changed_at);
