# JMESPath Transformer

An Angular application for loading or pasting JSON and transforming it with a JMESPath expression.

## Development

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Built / test / run locally

### Build and test

```bash
npm run build
npm test -- --watch=false
```

### Build for docker

```bash
docker build -t jmespath-transformer:latest .
```

### Run on docker

```bash
docker run -d -p 8182:8182 --name jmespath-transformer jmespath-transformer
```

Open `http://localhost:8182`.

## Pull and run from this repository

```bash
docker pull ghcr.io/lmondeil-tools/lmondeil.jmespath
docker run -d -p 8183:8182 --name lmondeil-jmespath ghcr.io/lmondeil-tools/lmondeil.jmespath
```

