pipeline {
    agent any

    environment {
        AWS_REGION        = 'us-east-1'
        AWS_ACCOUNT_ID    = '949193188574'

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
            steps {
                sh '''
                    set -e

                    echo "===== Frontend Build ====="

                    cd frontend

                    echo "Node version:"
                    node --version || true

                    echo "NPM version:"
                    npm --version || true

                    echo "Installing frontend dependencies..."
                    npm install

                    echo "Building React/Vite application..."
                    npm run build

                    echo "Frontend build completed successfully."
                '''
            }
        }

        stage('Backend Validation') {
            steps {
                sh '''
                    set -e

                    echo "===== Backend Validation ====="

                    cd backend

                    echo "Node version:"
                    node --version || true

                    echo "NPM version:"
                    npm --version || true

                    echo "Installing backend dependencies..."
                    npm install

                    echo "Checking server.js syntax..."
                    node --check server.js

                    echo "Backend validation completed successfully."
                '''
            }
        }

        stage('SonarQube Code Analysis') {
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

                            docker run --rm \
                                --network ${DOCKER_NETWORK} \
                                --add-host=host.docker.internal:host-gateway \
                                -e SONAR_HOST_URL="http://host.docker.internal:9000" \
                                -e SONAR_TOKEN="${SONAR_TOKEN}" \
                                -e SONAR_USER_HOME="/tmp/.sonar" \
                                -v "${WORKSPACE}:/usr/src" \
                                -w /usr/src \
                                sonarsource/sonar-scanner-cli \
                                -Dsonar.projectKey=ecommerce-app \
                                -Dsonar.projectName=ecommerce-app \
                                -Dsonar.sources=frontend,backend \
                                -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/.git/**" \
                                -Dsonar.working.directory=/tmp/.scannerwork
                        '''
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy Filesystem Security Scan') {
            steps {
                sh '''
                    set +e

                    echo "===== Trivy Filesystem Scan ====="

                    docker run --rm \
                        -v "${WORKSPACE}:/root/workspace" \
                        aquasec/trivy:latest fs \
                        /root/workspace \
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
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-credentials',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "===== Logging into Amazon ECR ====="

                        aws ecr get-login-password \
                            --region ${AWS_REGION} \
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
                '''
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
            CI PIPELINE COMPLETED SUCCESSFULLY
            ================================================

            Frontend Image:
            ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPO}:${IMAGE_TAG}

            Backend Image:
            ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPO}:${IMAGE_TAG}

            Images have been scanned and pushed to Amazon ECR.
            ================================================
            """
        }

        failure {
            echo """
            ================================================
            CI PIPELINE FAILED
            ================================================

            Check the failed stage in the Jenkins console output.
            ================================================
            """
        }
    }
}
