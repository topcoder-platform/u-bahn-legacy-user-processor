# Use the base image with Node.js 8.11.3
FROM node:12.16.3

# Copy the current directory into the Docker image
COPY . /identity-processor

# Set working directory for future use
WORKDIR /identity-processor

# Install the dependencies from package.json
RUN npm install
CMD npm start
