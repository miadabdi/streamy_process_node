###################
# Prepare Stage
###################

FROM node:22.14.0-bookworm-slim AS prepare

# ffmpeg/ffprobe for transcoding, procps for nice, curl for healthchecks
RUN apt-get update && apt-get install -y ffmpeg procps curl && rm -rf /var/lib/apt/lists/*

# Set up working directory
RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app

# Copy dependency manifests (no chown yet)
COPY package*.json ./

###################
# Development Stage
###################

FROM prepare AS development

# Install all dependencies (including devDependencies)
# Run as root to avoid permission issues with mounted volumes
RUN npm install

ENV NODE_ENV=development

# Copy all source files
COPY . .

# Build the application
RUN npm run build

# Expose application and debug ports
EXPOSE 3001
EXPOSE 9229

# Don't switch to node user - stay as root for development

###################
# Production Stage
###################

FROM prepare AS production

ENV NODE_ENV=production \
    FFMPEG_PATH=ffmpeg \
    FFPROBE_PATH=ffprobe

# Now we set proper ownership for production
RUN chown -R node:node /home/node/app

# Switch to node user for production
USER node

# Copy built application and package files from development stage
COPY --chown=node:node --from=development /home/node/app/dist ./dist
COPY --chown=node:node --from=development /home/node/app/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Expose application port
EXPOSE 3001

# Default command (no entrypoint: the worker has no migrations to run)
CMD ["node", "dist/main"]
