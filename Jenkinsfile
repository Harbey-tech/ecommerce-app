pipeline {
    agent any

    environment {
        AWS_REGION        = 'us-east-1'
        AWS_ACCOUNT_ID    = '949193188574'
        ECR_REPO_NAME     = 'ecommerce-app'
        IMAGE_TAG         = "${BUILD_NUMBER}"
        SONAR_SERVER_NAME = 'sonar-server'
        DOCKER_NETWORK    = 'bridge'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Unit Tests') {
            steps {
                dir('frontend') {
                    sh '''
                        if [ -f package.json ]; then
                            docker run --rm \
                                -v "$(pwd):/app" \
                                -w /app \
                                node:18-alpine \
                                sh -c "npm test || true"
                        else
                            echo "No package.json found in frontend directory. Skipping unit tests."
                        fi
                    '''
                }
            }
        }

        stage('SonarQube Code Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    withSonarQubeEnv("${SONAR_SERVER_NAME}") {
                        sh '''
                            docker run --rm \
                                --network ${DOCKER_NETWORK} \
                                --add-host=host.docker.internal:host-gateway \
                                -e SONAR_HOST_URL="http://host.docker.internal:9000" \
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
                    dir('frontend') {
                        dockerImage = docker.build("${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}")
                    }
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
