variable "project_id" {
  type    = string
  default = "wax-attic"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "firebase_hosting_site_id" {
  type        = string
  default     = "wax-attic-staging"
  description = "Firebase Hosting site ID for staging."
}
