# cube.js s3 S3FileRepository

> test with minio

## Usage

* add .env file

```code
CUBEJS_S3_ENDPOINT=localhost
CUBEJS_S3_PORT=9000
CUBEJS_S3_SSL=minio
CUBEJS_S3_ACCESSKEY=minio123
CUBEJS_s3_SECRETKEY=demoapp
CUBEJS_S3_BUCKET=demo
```

* cube.js file

```code
const myS3FileRepository = require("@dalongrong/cube-s3repository")

module.exports = {
    ...
    repositoryFactory: myS3FileRepository.repositoryFactory,
    ...
};
```

## Some Notes

* 2.x is not same as 1.x version