# Online Portfolio

[Visit the Live Site](https://bbinteractive.io)

## Features

- **Native Swipe Parallax Carousel**: Previews for each portfolio project are presented through an infinite parallax carousel with seamless, native left/right user swiping. There are reasons you've probably never seen a carousel like this.
  - **Device Overlays**: Screenshots are dynamically overlaid onto mobile and desktop device mockups for a professional presentation.
  - **Dynamic Routing**: Each slide is linked through dynamic routing, ensuring a smooth and engaging user experience with deep linkning available.
  - **Actionable Links**: Includes buttons to access:
    - Code repositories
    - Video project walkthroughs
    - Live or staging deployments
- **Modern Design**: Responsive and visually appealing UI designed to showcase my work.
- **Dynamic Components**: Includes reusable components.
- **Scalability**: Built with a focus on maintainability and expansion.

## Roadmap

- **Backend Integration**: Integrate a fully custom backend using Express, MongoDB, and Redux. I have functioning boilerplate started for this in another repo that's ready to repurpose.
- **Project Enhancements**: I see defects in some of my portfolio projects as they age. Those are in separate repos, but this is on my radar. Some of them I'd love to upgrade to their current framework versions.
- **Walktrough Videos Play in Project Carousel** This would be a dream, but I'll need to come back to it after the previous items.
- **Additional Features**: Many more ideas for future improvements and features are under consideration that I'll need to have a lot of free time for, lol.

## Technologies Used

- **Front-End**: React, TypeScript, JSX, SCSS
- **Back-End**: TypeScript, React Router, React Redux
- **Tooling**: Vite, ESLint, Prettier
- **Design**: Mobile-first approach, responsive breakpoints

## Infrastructure & Deployment

This portfolio is deployed using **enterprise-grade Infrastructure as Code** practices, demonstrating professional DevOps capabilities and cloud architecture knowledge.

### 🏗️ **Architecture Overview**

- **Cloud Provider**: Amazon Web Services (AWS)
- **Infrastructure as Code**: Terraform for complete automation
- **Compute**: EC2 t3.medium with automated configuration
- **Load Balancing**: Nginx reverse proxy for professional routing
- **Containerization**: Docker with dual registry strategy (Docker Hub + ECR)
- **Storage**: S3 buckets for media assets with environment isolation
- **Networking**: Elastic IP (44.250.92.40), Security Groups, VPC integration
- **Domain**: Custom domain (bbinteractive.io) with DNS management

### 🚀 **Deployment Process**

The entire infrastructure can be deployed or destroyed with single commands:

```bash
# Deploy complete infrastructure
cd infra/
terraform plan    # Review changes
terraform apply   # Deploy infrastructure (creates 25+ AWS resources)

# Destroy infrastructure
terraform destroy # Clean teardown of all resources
```

**What happens during deployment:**

1. **AWS Resources Created**: EC2 instance, Elastic IP, Security Groups, IAM roles, S3 buckets, ECR repositories
2. **Automated Configuration**: Docker, Nginx, and application services installed via user_data scripts
3. **Container Deployment**: Development containers pulled from Docker Hub and started automatically
4. **Service Management**: Systemd services configured for auto-restart and boot persistence
5. **Domain Pointing**: DNS A records pointed to Elastic IP for live website access

### 🔄 **Container Management**

**Dual Registry Strategy:**

- **Development**: Images from Docker Hub (`bhbaysinger/portfolio-*:dev`)
- **Production**: Images from Amazon ECR (`*.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-*:latest`)

**Container Profiles:**

```bash
# Switch between environments
./portfolio-management.sh switch dev   # Use Docker Hub images
./portfolio-management.sh switch prod  # Use ECR images
./portfolio-management.sh status       # Check container health
./portfolio-management.sh deploy       # Deploy from ECR
```

### 🛡️ **Production Features**

- **Zero Manual Configuration**: Everything automated via Terraform and user_data scripts
- **Auto-Healing**: Systemd services restart containers on failure
- **Environment Isolation**: Separate S3 buckets and configurations for dev/staging/prod
- **Security**: IAM roles with least-privilege access, encrypted storage, security groups
- **Scalability Ready**: Architecture supports load balancers, auto-scaling, and CDN integration
- **Cost Optimized**: Resources sized appropriately with lifecycle policies for cleanup

### 📊 **Infrastructure Validation**

This deployment demonstrates:

- **Infrastructure as Code** mastery with Terraform
- **Container orchestration** with Docker and systemd
- **Cloud architecture** design and implementation
- **DevOps automation** and best practices
- **Professional deployment** workflows and documentation
- **System reliability** with auto-restart and monitoring capabilities

The infrastructure successfully passed **complete recreation testing** - the entire environment was destroyed and recreated to verify automation works flawlessly.

### 📚 **Documentation**

For detailed technical documentation:

- **Architecture Decisions**: [`/docs/architecture-decisions.md`](./docs/architecture-decisions.md)
- **Infrastructure Guide**: [`/infra/README.md`](./infra/README.md)
- **Deployment Instructions**: [`/DEPLOYMENT.md`](./DEPLOYMENT.md)

# Updated EC2 IP: 44.250.92.40
# Updated Wed Oct  8 02:06:08 PDT 2025
