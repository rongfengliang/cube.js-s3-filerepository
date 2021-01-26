const Minio = require('minio')
const streamToPromise = require('stream-to-promise');
/**
 * mys3 file repository
 */
class  S3FileRepository {
    // init config with env
    constructor(){
         this.minioClient = new Minio.Client({
            endPoint: process.env.cube_s3_endpoint,
            port: parseInt(process.env.cube_s3_port),
            useSSL:  process.env.cube_s3_ssl=="true" ? true : false,
            accessKey: process.env.cube_s3_accesskey,
            secretKey: process.env.cube_s3_secretkey
          });
    }
    async dataSchemaFiles() {
        var localminioClient = this.minioClient
        var bucket = process.env.cube_s3_bucket
        var Files = await streamToPromise(localminioClient.listObjectsV2(bucket, "", true))
        var fileContents = []
        for (const file of Files) {
            try {
                const fileBuffer = await streamToPromise(await localminioClient.getObject(bucket, file.name))
                let  fileItemContent = fileBuffer.toString('utf-8');
                fileContents.push({fileName: file.name, content: fileItemContent})
            }
            catch(e){
                console.log(e)
            }
        }
        return fileContents;
    }
}

module.exports = {
    repositoryFactory: ({ authInfo }) => new S3FileRepository(),
};