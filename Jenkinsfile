pipeline {
    agent any

    environment {
        AWS_REGION        = 'us-east-1'
        AWS_ACCOUNT_ID    = '123456789012' // Replace with your actual AWS Account ID
        ECR_REPO_NAME     = 'ecommerce-app'
        IMAGE_TAG         = "${BUILD_NUMBER}"
        SONAR_SERVER_NAME = 'sonar-server'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Static Code Analysis') {
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

        stage('Quality Gate') {
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

        stage('Push Image to AWS ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                        docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}
                        docker tag ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
                        docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
                    """
                }
            }
        }

        stage('Deploy Application') {
            steps {
                sh """
                    docker stop ecommerce-prod || true
                    docker rm ecommerce-prod || true
                    docker run -d --name ecommerce-prod \
                        -p 80:80 \
                        ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest
                """
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
        success {
            echo "Pipeline completed successfully! App updated to build #${BUILD_NUMBER}."
        }
        failure {
            echo "Pipeline failed! Check stage logs for details."
        }
    }
}
