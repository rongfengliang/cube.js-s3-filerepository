const Minio = require('minio')
const streamToPromise = require('stream-to-promise');
const path = require('path');
const fs = require('fs-extra');
const R = require('ramda');
/**
 * mys3 file repository
 */
class S3FileRepository {
    // init config with env
    constructor() {
        this.minioClient = new Minio.Client({
            endPoint: process.env.cube_s3_endpoint,
            port: parseInt(process.env.cube_s3_port),
            useSSL: process.env.cube_s3_ssl == "true" ? true : false,
            accessKey: process.env.cube_s3_accesskey,
            secretKey: process.env.cube_s3_secretkey
        });
    }
    async dataSchemaFiles(includeDependencies=true) {
        var localminioClient = this.minioClient
        var bucket = process.env.cube_s3_bucket
        var Files = await streamToPromise(localminioClient.listObjectsV2(bucket, "", true))
        var fileContents = []
        for (const file of Files) {
            try {
                const fileBuffer = await streamToPromise(await localminioClient.getObject(bucket, file.name))
                let fileItemContent = fileBuffer.toString('utf-8');
                fileContents.push({ fileName: file.name, content: fileItemContent })
            }
            catch (e) {
                console.log(e)
            }
        }
        if (includeDependencies) {
            fileContents = fileContents.concat(await this.readModules());
        }
        return fileContents;
    }
    async readModules() {
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
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

module.exports = {
    repositoryFactory: ({ authInfo }) => new S3FileRepository(),
};