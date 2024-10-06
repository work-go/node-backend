# Use Node.js 22.1.0
FROM node:22.1.0

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
# COPY package*.json ./
# RUN npm install

# Copy application code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# The command is managed by docker-compose
