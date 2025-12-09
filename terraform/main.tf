terraform {
  required_version = "~> 1.14.0"

  cloud {
    organization = "rindrics"
    workspaces {
      name = "mikazuki-munechika"
    }
  }

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 4.1"
    }
  }
}

provider "vercel" {
    api_token = var.vercel_api_token
}

data "vercel_project" "main" {
  name = var.vercel_project_name
}
