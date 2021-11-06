# Use the base image with Node.js 8.11.3
FROM node:12.22.7

# Copy the current directory into the Docker image
COPY . /identity-data-processor

# Set working directory for future use
WORKDIR /identity-data-processor

# Install the dependencies from package.json
RUN npm install
CMD npm start
