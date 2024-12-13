FROM ghcr.io/puppeteer/puppeteer:21.0.0

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Start the server
CMD [ "node", "your-main-file.js" ]