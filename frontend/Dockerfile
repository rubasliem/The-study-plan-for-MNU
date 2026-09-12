# 1. Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2. Production Stage with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ensure bootstrap-icons fonts are available in both /assets/fonts and /fonts paths
RUN mkdir -p /usr/share/nginx/html/assets/fonts /usr/share/nginx/html/fonts && \
    cp /usr/share/nginx/html/assets/bootstrap-icons*.woff* /usr/share/nginx/html/assets/fonts/bootstrap-icons.woff2 2>/dev/null || true && \
    cp /usr/share/nginx/html/assets/bootstrap-icons*.woff /usr/share/nginx/html/assets/fonts/bootstrap-icons.woff 2>/dev/null || true && \
    cp -r /usr/share/nginx/html/assets/fonts/* /usr/share/nginx/html/fonts/ 2>/dev/null || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
