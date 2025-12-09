TERRAFORM_CODE_DIR := terraform
TF := cd $(TERRAFORM_CODE_DIR) && terraform

.PHONY: plan apply init format

plan: init
	$(TF) plan

apply: init
	$(TF) apply

format:
	$(TF) fmt

init:
	$(TF) init
