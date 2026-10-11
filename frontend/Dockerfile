FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Chạy mode dev và bind IP host để truy cập từ ngoài container
CMD ["npm", "run", "dev", "--", "--host"]
