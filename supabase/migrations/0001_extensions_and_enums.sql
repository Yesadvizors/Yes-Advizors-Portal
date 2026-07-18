-- G-2b authored migration — AUTHORED NOT APPLIED; reviewed under G-2b before G-3.
-- Source: G-2a V1 reference v1_schema_reference.sql (REFERENCE ONLY), enum block lines 218-517.
-- Purpose: extensions + application enum types required by V2 tables.
-- Scope-map: all 19 enums KEEP (verbatim from reference; used by V2-required tables).

-- gen_random_uuid() is built-in in PostgreSQL 13+ (Supabase uses 15/17); pgcrypto kept for parity.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.audit_type_enum AS ENUM (
    'Statutory Audit','Tax Audit','Trust Audit','Internal Audit','GSTR-9C / GST Audit',
    'Stock Audit','Bank Audit','Management Audit','Due Diligence','Special Purpose Audit','Section 8 / NGO Audit'
);

CREATE TYPE public.client_status_enum AS ENUM ('Active','Inactive','Closed','Prospect');

CREATE TYPE public.client_type_enum AS ENUM (
    'Individual','Proprietor','HUF','Partnership Firm','LLP','Private Limited Company',
    'Limited Company','Section 8 Company','Trust','Society'
);

CREATE TYPE public.compliance_status_enum AS ENUM (
    'Not Started','Data Pending','Documents Pending','Assigned','In Progress','Prepared',
    'Waiting for Client','Waiting for Internal Team','Reviewed','Partner Approval Pending',
    'Payment Pending','Filing Pending','Partner Approved','Filed','Completed','Overdue',
    'Not Applicable','Closed'
);

CREATE TYPE public.dkyc_change_type_enum AS ENUM ('EMAIL','MOBILE','RESIDENTIAL_ADDRESS','MULTIPLE','OTHER');

CREATE TYPE public.dkyc_record_type_enum AS ENUM ('PERIODIC_KYC','EVENT_UPDATE','REACTIVATION','HISTORICAL');

CREATE TYPE public.document_category_enum AS ENUM (
    'PAN','GST Certificate','TAN','Incorporation Certificate','MOA / AOA','LLP Agreement',
    'Trust Deed','Partnership Deed','Bank Statement','Trial Balance','Ledger','Sales Register',
    'Purchase Register','GSTR-1','GSTR-3B','GSTR-2B','TDS Challan','Form 26AS','AIS','TIS',
    'Financial Statement','Audit Report','ROC Challan','MCA Form','Notice','Reply',
    'Assessment Order','Working Paper','SHA','SPA','Other Document'
);

CREATE TYPE public.gst_frequency_enum AS ENUM ('Monthly','Quarterly_QRMP','Composition');

CREATE TYPE public.gst_return_type_enum AS ENUM (
    'GSTR-1','GSTR-3B','GSTR-9','GSTR-9C','CMP-08','GSTR-4','LUT','GST Refund',
    'GST Notice Reply','E-Way Bill','E-Invoice'
);

CREATE TYPE public.month_enum AS ENUM (
    'April','May','June','July','August','September','October','November','December',
    'January','February','March'
);

CREATE TYPE public.notice_authority_enum AS ENUM (
    'Income Tax','GST','TDS','ROC / MCA','PF','ESI','Labour Department','Other'
);

CREATE TYPE public.portal_role_enum AS ENUM ('Admin','Manager','Executive','Staff','Viewer');

CREATE TYPE public.priority_enum AS ENUM ('Low','Medium','High','Critical');

CREATE TYPE public.quarter_enum AS ENUM ('Q1','Q2','Q3','Q4');

CREATE TYPE public.reminder_channel_enum AS ENUM ('In-App','Email','WhatsApp');

CREATE TYPE public.roc_filing_type_enum AS ENUM ('Annual','Event Based');

CREATE TYPE public.tds_form_enum AS ENUM ('24Q','26Q','27Q','27EQ');

CREATE TYPE public.user_role_enum AS ENUM ('Partner','Manager','Team Member','Client');

CREATE TYPE public.workflow_stage_enum AS ENUM ('Assigned','In Progress','Prepared','Reviewed','Partner Approved','Filed');
