variable "project_id" {
  type    = string
  default = "wax-attic"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "billing_account_id" {
  type        = string
  description = "GCP billing account ID (format: XXXXXX-XXXXXX-XXXXXX). Run: gcloud billing accounts list"
}

variable "monthly_budget_usd" {
  type    = number
  default = 10
}

variable "github_owner" {
  type = string
}

variable "github_repo" {
  type    = string
  default = "wax-attic-splash"
}
