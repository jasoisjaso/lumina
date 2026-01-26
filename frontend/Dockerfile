# Stage 1: Build the React application
FROM --platform=$BUILDPLATFORM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set NODE_ENV to production for proper API URL handling
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
