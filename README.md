# JMESPath Transformer

An Angular application for loading or pasting JSON and transforming it with a JMESPath expression.

## Development

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Build and test

```bash
npm run build
npm test -- --watch=false
```

## Build for docker

```bash
docker build -t jmespath-transformer:latest .
```

## Run on docker

```bash
docker run -d -p 8182:8182 --name jmespath-transformer jmespath-transformer
```

Open `http://localhost:8182`.
