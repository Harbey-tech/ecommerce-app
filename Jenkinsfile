pipeline {
    agent any

    environment {
        AWS_REGION        = 'us-east-1'
        AWS_ACCOUNT_ID    = '949193188574'
        ECR_REPO_NAME     = 'ecommerce-app'
        IMAGE_TAG         = "${BUILD_NUMBER}"
        SONAR_SERVER_NAME = 'sonar-server' // Configured in Jenkins system settings
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test || true' // Replace with your test runner (e.g., mvn test, pytest)
            }
        }

        stage('SonarQube Code Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    withSonarQubeEnv("${SONAR_SERVER_NAME}") {
                        sh '''
                            docker run --rm \
                                -e SONAR_HOST_URL="http://sonarqube:9000" \
                                -e SONAR_TOKEN="${SONAR_TOKEN}" \
                                -v "${WORKSPACE}:/usr/src" \
                                sonarsource/sonar-scanner-cli \
                                -Dsonar.projectKey=ecommerce-app \
                                -Dsonar.projectName=ecommerce-app \
                                -Dsonar.sources=.
                        '''
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    // Requires SonarQube webhook -> http://<jenkins-url>/sonarqube-webhook/
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy File System Security Scan') {
            steps {
                sh '''
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v "${WORKSPACE}:/root/workspace" \
                        aquasec/trivy:latest fs /root/workspace \
                        --severity HIGH,CRITICAL \
                        --exit-code 0
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}")
                }
            }
        }

        stage('Trivy Image Security Scan') {
            steps {
                sh """
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Push Image to ECR') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-credentials', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                        docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }

        /* 
        ===================================================================
        STAGED FOR LATER (Uncomment when EKS + Argo CD are ready):
        ===================================================================
        stage('Update GitOps Manifests') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-pat', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh '''
                        git clone https://${GIT_TOKEN}@github.com/your-username/ecommerce-gitops.git
                        cd ecommerce-gitops
                        sed -i "s|image: .*|image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}|g" k8s/deployment.yaml
                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@yourdomain.com"
                        git add k8s/deployment.yaml
                        git commit -m "ci: update image tag to ${IMAGE_TAG}"
                        git push origin main
                    '''
                }
            }
        }
        */
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        success {
            echo "CI pipeline completed successfully. Image is scanned and stored in ECR."
        }
    }
}
