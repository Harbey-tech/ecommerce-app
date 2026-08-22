```groovy
pipeline {
    agent any

    environment {
        AWS_REGION        = 'us-east-1'
        AWS_ACCOUNT_ID    = '949193188574'
        EKS_CLUSTER_NAME  = 'ecommerce-eks-cluster'

        FRONTEND_ECR_REPO = 'ecommerce-frontend'
        BACKEND_ECR_REPO  = 'ecommerce-backend'

        IMAGE_TAG         = "${BUILD_NUMBER}"

        SONAR_SERVER_NAME = 'sonar-server'
        DOCKER_NETWORK    = 'bridge'
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm

                sh '''
                    echo "===== Project Structure ====="
                    find . -maxdepth 2 -type f | sort
                '''
            }
        }

        stage('Frontend Build') {
            agent {
                docker {
                    image 'node:18-alpine'
                    args '-u root:root'
                    reuseNode true
                }
            }

            steps {
                dir('frontend') {
                    sh '''
                        set -e

                        echo "===== Frontend Build ====="

                        echo "Node version:"
                        node --version

                        echo "NPM version:"
                        npm --version

                        echo "Installing frontend dependencies..."
                        npm install

                        echo "Building React/Vite application..."
                        npm run build

                        echo "Frontend build completed successfully."
                    '''
                }
            }
        }

        stage('Backend Validation') {
            agent {
                docker {
                    image 'node:18-alpine'
                    args '-u root:root'
                    reuseNode true
                }
            }

            steps {
                dir('backend') {
                    sh '''
                        set -e

                        echo "===== Backend Validation ====="

                        echo "Node version:"
                        node --version

                        echo "NPM version:"
                        npm --version

                        echo "Installing backend dependencies..."
                        npm install

                        echo "Checking server.js syntax..."
                        node --check server.js

                        echo "Backend validation completed successfully."
                    '''
                }
            }
        }

        stage('SonarQube Code Analysis') {
            agent {
                docker {
                    image 'sonarsource/sonar-scanner-cli'
                    args '--network bridge --add-host=host.docker.internal:host-gateway -u root:root'
                    reuseNode true
                }
            }

            steps {
                withCredentials([
                    string(
                        credentialsId: 'sonar-token',
                        variable: 'SONAR_TOKEN'
                    )
                ]) {

                    withSonarQubeEnv("${SONAR_SERVER_NAME}") {

                        sh '''
                            set -e

                            echo "===== SonarQube Analysis ====="

                            export SONAR_USER_HOME=/tmp/.sonar

                            sonar-scanner \
                                -Dsonar.host.url="http://host.docker.internal:9000" \
                                -Dsonar.token="${SONAR_TOKEN}" \
                                -Dsonar.projectKey=ecommerce-app \
                                -Dsonar.projectName=ecommerce-app \
                                -Dsonar.sources=frontend,backend \
                                -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/.git/**" \
                                -Dsonar.working.directory=.scannerwork
                        '''
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 15, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy Filesystem Security Scan') {
            agent {
                docker {
                    image 'aquasec/trivy:latest'
                    args "-u root:root --entrypoint=''"
                    reuseNode true
                }
            }

            steps {
                sh '''
                    set +e

                    echo "===== Trivy Filesystem Scan ====="

                    trivy fs . \
                        --severity HIGH,CRITICAL \
                        --exit-code 0

                    echo "Filesystem security scan completed."
                '''
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "===== Building Frontend Docker Image ====="

                    docker build \
                        -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}:${IMAGE_TAG} \
                        ./frontend

                    echo "Frontend image built successfully."

                    docker images | grep "${FRONTEND_ECR_REPO}"
                '''
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "===== Building Backend Docker Image ====="

                    docker build \
                        -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}:${IMAGE_TAG} \
                        ./backend

                    echo "Backend image built successfully."

                    docker images | grep "${BACKEND_ECR_REPO}"
                '''
            }
        }

        stage('Trivy Frontend Image Scan') {
            steps {
                sh '''
                    set +e

                    echo "===== Trivy Frontend Image Scan ====="

                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}:${IMAGE_TAG}

                    echo "Frontend image scan completed."
                '''
            }
        }

        stage('Trivy Backend Image Scan') {
            steps {
                sh '''
                    set +e

                    echo "===== Trivy Backend Image Scan ====="

                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}:${IMAGE_TAG}

                    echo "Backend image scan completed."
                '''
            }
        }

        stage('Login to Amazon ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {

                    sh '''
                        set -e

                        echo "===== Logging into Amazon ECR ====="

                        docker run --rm \
                            -e AWS_ACCESS_KEY_ID \
                            -e AWS_SECRET_ACCESS_KEY \
                            -e AWS_SESSION_TOKEN \
                            -e AWS_DEFAULT_REGION="${AWS_REGION}" \
                            amazon/aws-cli \
                            ecr get-login-password \
                            --region "${AWS_REGION}" \
                            | docker login \
                            --username AWS \
                            --password-stdin \
                            ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

                        echo "ECR login successful."
                    '''
                }
            }
        }

        stage('Push Frontend Image to ECR') {
            steps {
                sh '''
                    set -e

                    echo "===== Pushing Frontend Image ====="

                    docker push \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}:${IMAGE_TAG}

                    echo "Frontend image pushed successfully."
                '''
            }
        }

        stage('Push Backend Image to ECR') {
            steps {
                sh '''
                    set -e

                    echo "===== Pushing Backend Image ====="

                    docker push \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}:${IMAGE_TAG}

                    echo "Backend image pushed successfully."
                '''
            }
        }

        stage('Update GitOps Manifest') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-credentials',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "=============================================="
                        echo "      UPDATING GITOPS HELM MANIFEST"
                        echo "=============================================="

                        echo ""
                        echo "Jenkins Build Number:"
                        echo "${BUILD_NUMBER}"

                        echo ""
                        echo "Image Tag:"
                        echo "${IMAGE_TAG}"

                        echo ""
                        echo "===== Current Frontend Configuration ====="
                        grep -A5 '^frontend:' helm/ecommerce-app/values.yaml || true

                        echo ""
                        echo "===== Current Backend Configuration ====="
                        grep -A5 '^backend:' helm/ecommerce-app/values.yaml || true

                        echo ""
                        echo "===== Updating Frontend Image Tag ====="

                        sed -i '/^frontend:/,/^backend:/ s/tag: "[0-9]*"/tag: "'"${IMAGE_TAG}"'"/' \
                            helm/ecommerce-app/values.yaml

                        echo "===== Updating Backend Image Tag ====="

                        sed -i '/^backend:/,/^postgres:/ s/tag: "[0-9]*"/tag: "'"${IMAGE_TAG}"'"/' \
                            helm/ecommerce-app/values.yaml

                        echo ""
                        echo "===== Updated Frontend Configuration ====="
                        grep -A5 '^frontend:' helm/ecommerce-app/values.yaml

                        echo ""
                        echo "===== Updated Backend Configuration ====="
                        grep -A5 '^backend:' helm/ecommerce-app/values.yaml

                        echo ""
                        echo "===== Verifying Image Tags ====="

                        FRONTEND_TAG=$(awk '
                            /^frontend:/ { in_frontend=1 }
                            /^backend:/ { in_frontend=0 }
                            in_frontend && /tag:/ {
                                gsub(/"/, "", $2)
                                print $2
                                exit
                            }
                        ' helm/ecommerce-app/values.yaml)

                        BACKEND_TAG=$(awk '
                            /^backend:/ { in_backend=1 }
                            /^postgres:/ { in_backend=0 }
                            in_backend && /tag:/ {
                                gsub(/"/, "", $2)
                                print $2
                                exit
                            }
                        ' helm/ecommerce-app/values.yaml)

                        echo "Expected frontend tag: ${IMAGE_TAG}"
                        echo "Actual frontend tag:   ${FRONTEND_TAG}"

                        echo "Expected backend tag:  ${IMAGE_TAG}"
                        echo "Actual backend tag:    ${BACKEND_TAG}"

                        if [ "${FRONTEND_TAG}" != "${IMAGE_TAG}" ]; then
                            echo "ERROR: Frontend image tag was not updated."
                            exit 1
                        fi

                        if [ "${BACKEND_TAG}" != "${IMAGE_TAG}" ]; then
                            echo "ERROR: Backend image tag was not updated."
                            exit 1
                        fi

                        echo ""
                        echo "===== Git Status ====="

                        git status --short

                        echo ""
                        echo "===== Configuring Git ====="

                        git config user.email "jenkins@ci.local"
                        git config user.name "Jenkins CI"

                        echo ""
                        echo "===== Committing Helm Manifest ====="

                        git add helm/ecommerce-app/values.yaml

                        git commit \
                            -m "Bump image tags to ${IMAGE_TAG}" \
                            || echo "No changes to commit"

                        echo ""
                        echo "===== Pushing GitOps Manifest ====="

                        git push \
                            https://${GIT_USER}:${GIT_TOKEN}@github.com/Harbey-tech/ecommerce-app.git \
                            HEAD:main

                        echo ""
                        echo "=============================================="
                        echo " GITOPS MANIFEST UPDATED SUCCESSFULLY"
                        echo "=============================================="

                        echo ""
                        echo "Frontend image:"
                        echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}:${IMAGE_TAG}"

                        echo ""
                        echo "Backend image:"
                        echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}:${IMAGE_TAG}"

                        echo ""
                        echo "ArgoCD should now detect the Git change."
                    '''
                }
            }
        }
    }

    post {

        always {
            echo "===== Cleaning Docker Resources ====="

            sh '''
                docker image prune -f || true
            '''
        }

        success {
            echo """
            ================================================
            CI/CD PIPELINE COMPLETED SUCCESSFULLY
            ================================================

            Jenkins Build:
            ${BUILD_NUMBER}

            Frontend Image:
            ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}:${IMAGE_TAG}

            Backend Image:
            ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}:${IMAGE_TAG}

            Images pushed to ECR.

            Helm values updated in Git.

            ArgoCD should deploy the new images automatically.

            ================================================
            """
        }

        failure {
            echo """
            ================================================
            CI PIPELINE FAILED
            ================================================

            Build:
            ${BUILD_NUMBER}

            Check the failed stage in the Jenkins console output.

            ================================================
            """
        }
    }
}
```
