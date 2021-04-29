const Minio = require('minio')
const streamToPromise = require('stream-to-promise');
const path = require('path');
const fs = require('fs-extra');
const JSON5 = require('json5')
const R = require('ramda');
/**
 * mys3 file repository
 */
class S3FileRepository {
    // init config with env
    constructor(config) {
        const { ...restConfig } = config || {};
        this.config = {
            endPoint: process.env.CUBEJS_S3_ENDPOINT,
            port: parseInt(process.env.CUBEJS_S3_PORT),
            useSSL: process.env.CUBEJS_S3_SSL == "true" ? true : false,
            accessKey: process.env.CUBEJS_S3_ACCESSKEY,
            secretKey: process.env.CUBEJS_s3_SECRETKEY,
            bucket: process.env.CUBEJS_S3_BUCKET,
            mod: process.env.CUBEJS_S3_MOD || "pre", // current support prod and pre
            objectPrefix: "", // s3 object search  prefix default set ""
            ...restConfig,  // for better bucket with config not env
        };
        this.minioClient = new Minio.Client({
            endPoint: this.config.endPoint,
            port: this.config.port,
            useSSL: this.config.useSSL,
            accessKey: this.config.accessKey,
            secretKey: this.config.secretKey
        });
    }
    async dataSchemaFiles(includeDependencies = true) {
        var fileContents = []
        var self = this
        var bucket = self.config.bucket
        var objectPrefix = self.config.objectPrefix
        let metaObjectName = self.config.mod == "prod" ? "meta.json" : "meta-pre.json"
        // first fetch meta info: prod with  meta.json pre with meta-pre.json
        try {
            let metaObjectFileBuffer = await streamToPromise(await self.minioClient.getObject(bucket, `${objectPrefix}/${metaObjectName}`).catch(err => { console.log("some wrong", err) }))
            let metaObjectContent = JSON5.parse(metaObjectFileBuffer.toString('utf-8'));
            for (const key in metaObjectContent) {
                if (Object.hasOwnProperty.call(metaObjectContent, key)) {
                    try {
                        const fileBuffer = await streamToPromise(await self.minioClient.getObject(bucket, `${objectPrefix}/${key}`))
                        let fileItemContent = fileBuffer.toString('utf-8');
                        fileContents.push({ fileName: key, content: fileItemContent })
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
            }
            if (includeDependencies) {
                fileContents = fileContents.concat(await this.readModules());
            }
        } catch (error) {
            console.log("fetch meta info error",err)
        }
        return fileContents;
    }
    // for search with file
    async readModules() {
        const packageJson = JSON5.parse(await fs.readFile('package.json', 'utf-8'));
        const files = await Promise.all(
            Object.keys(packageJson.dependencies).map(async module => {
                if (R.endsWith('-schema', module)) {
                    return this.readModuleFiles(path.join('node_modules', module));
                }
                return [];
            })
        );
        return files.reduce((a, b) => a.concat(b));
    }

    async readModuleFiles(modulePath) {
        const files = await fs.readdir(modulePath);
        return (await Promise.all(
            files.map(async file => {
                const fileName = path.join(modulePath, file);
                const stats = await fs.lstat(fileName);
                if (stats.isDirectory()) {
                    return this.readModuleFiles(fileName);
                } else if (R.endsWith('.js', file)) {
                    const content = await fs.readFile(fileName, 'utf-8');
                    return [
                        {
                            fileName,
                            content,
                            readOnly: true
                        }
                    ];
                } else {
                    return [];
                }
            })
        )).reduce((a, b) => a.concat(b), []);
    }
}

// add default exports repositoryFactory
module.exports = {
    repositoryFactory: ({ securityContext }) => new S3FileRepository(),
    S3FileRepository: S3FileRepository
};