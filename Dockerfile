# Gagamit tayo ng official Node.js image base sa Debian slim para madaling macompile ang native packages
FROM node:20-slim

# Mag-install ng build dependencies para sa sqlite3 at bcrypt
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# I-setup ang working directory
WORKDIR /app

# Kopyahin at i-install ang root dependencies (tulad ng multer)
COPY package.json package-lock.json* ./
RUN npm install

# Kopyahin at i-install ang server dependencies (sqlite3, bcrypt, express, atbp.)
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --build-from-source

# Kopyahin ang buong code ng project
COPY server/ ./server/
COPY store/ ./store/
COPY admin/ ./admin/
COPY assets/ ./assets/
COPY index.html ./

# I-expose ang port (default ay 8000)
EXPOSE 8000

# Patakbuhin ang server
CMD ["node", "server/index.js"]
