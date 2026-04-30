-- Nuvemshop Orders (Sales Dashboard, KPIs)
CREATE INDEX IF NOT EXISTS idx_ns_orders_user_date ON public.nuvemshop_orders(user_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_ns_orders_user_payment ON public.nuvemshop_orders(user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_ns_orders_user_status ON public.nuvemshop_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ns_orders_phone ON public.nuvemshop_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_ns_orders_email ON public.nuvemshop_orders(customer_email);

-- Imported Customers (RFM, CRM)
CREATE INDEX IF NOT EXISTS idx_imp_cust_user_last_purchase ON public.imported_customers(user_id, last_purchase_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_imp_cust_user_total_spent ON public.imported_customers(user_id, total_spent DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_imp_cust_user_rfm ON public.imported_customers(user_id, rfm_score);
CREATE INDEX IF NOT EXISTS idx_imp_cust_phone ON public.imported_customers(phone);
CREATE INDEX IF NOT EXISTS idx_imp_cust_email ON public.imported_customers(email);
CREATE INDEX IF NOT EXISTS idx_imp_cust_cluster ON public.imported_customers(cluster_id);

-- Abandoned Checkouts (Recovery)
CREATE INDEX IF NOT EXISTS idx_ns_carts_user_status ON public.nuvemshop_abandoned_checkouts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ns_carts_user_created ON public.nuvemshop_abandoned_checkouts(user_id, created_at_nuvemshop DESC);
CREATE INDEX IF NOT EXISTS idx_ns_carts_recovery_status ON public.nuvemshop_abandoned_checkouts(recovery_status);
CREATE INDEX IF NOT EXISTS idx_ns_carts_phone ON public.nuvemshop_abandoned_checkouts(customer_phone);

-- Conversations & Messages (Inbox)
CREATE INDEX IF NOT EXISTS idx_conv_user_archived_last_msg ON public.conversations(user_id, is_archived, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conv_user_channel ON public.conversations(user_id, channel);
CREATE INDEX IF NOT EXISTS idx_conv_contact ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON public.messages(user_id, created_at DESC);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_phone ON public.contacts(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_contacts_user_email ON public.contacts(user_id, email);

-- Email Queue (background processing)
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON public.email_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_user_campaign ON public.email_queue(user_id, campaign_id);

-- WhatsApp Queue
CREATE INDEX IF NOT EXISTS idx_wa_queue_status_scheduled ON public.whatsapp_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wa_queue_user_campaign ON public.whatsapp_queue(user_id, campaign_id);

-- Journey Executions
CREATE INDEX IF NOT EXISTS idx_journey_exec_status_next ON public.journey_executions(status, next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_journey_exec_user_journey ON public.journey_executions(user_id, journey_id);

-- Recovery Executions
CREATE INDEX IF NOT EXISTS idx_recovery_exec_user_status ON public.recovery_executions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recovery_exec_checkout ON public.recovery_executions(checkout_id);

-- Automation Executions
CREATE INDEX IF NOT EXISTS idx_auto_exec_status_scheduled ON public.automation_executions(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_auto_exec_user_flow ON public.automation_executions(user_id, flow_id);

-- Page Views (analytics)
CREATE INDEX IF NOT EXISTS idx_page_views_user_created ON public.page_views(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON public.page_views(visitor_id);

-- Send Logs
CREATE INDEX IF NOT EXISTS idx_send_logs_user_sent ON public.send_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_send_logs_campaign ON public.send_logs(campaign_id);

-- Meta Comments
CREATE INDEX IF NOT EXISTS idx_meta_comments_user_status ON public.meta_comments(user_id, status);

-- Email Unsubscribes
CREATE INDEX IF NOT EXISTS idx_email_unsubs_email ON public.email_unsubscribes(email);