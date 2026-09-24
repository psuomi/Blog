pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                sh 'git pull origin main'
            }
        }
        stage('Test image') {
              steps {
                  sh 'trivy image node:20-alpine'
              }
        }
        stage('Test code') {
            steps {
                sh 'trivy fs --scanners vuln,secret,misconfig /home/server/Projects/Blog/'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build --pull --rm -f "Dockerfile" -t blog:latest "."'
            }
        }
        stage('Run') {
            steps {
                sh 'docker stop blog || true'
                sh 'docker rm blog || true'
                sh 'docker run -d -p 3000:3000 --name blog blog'
            }
        }
        stage('Nikto') {
            steps {
                sh 'nikto -h localhost -p 3000'
            }
        }
    }
}
