FROM node:22-slim

# Bổ sung các thư viện cần thiết cho Prisma hoạt động tốt trên môi trường Linux
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Khởi tạo Prisma Client
RUN npx prisma generate

EXPOSE 3000

# Chạy bằng ts-node (trong môi trường Production thực tế nên build ra js)
CMD ["npx", "ts-node", "src/server.ts"]
