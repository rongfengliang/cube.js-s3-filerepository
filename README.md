# cube.js s3 S3FileRepository

> test with minio

## Usage

* add .env file

```code
cube_s3_endpoint=localhost
cube_s3_port=9000
cube_s3_accesskey=minio
cube_s3_ssl=false
cube_s3_secretkey=minio123
cube_s3_bucket=demo
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