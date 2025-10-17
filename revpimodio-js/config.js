import fs from 'fs';
import path from 'path';

const CONFIG_PATHS = ['/etc/revpi/config.rsc', '/opt/KUNBUS/config.rsc'];

class Config {
    constructor() {
        this.configPath = null;
        this.config = null;
    }

    findConfig() {
        for (const p of CONFIG_PATHS) {
            if (fs.existsSync(p)) {
                this.configPath = p;
                return p;
            }
        }
        throw new Error('Could not find piCtory configuration file.');
    }

    load() {
        if (!this.configPath) {
            this.configPath = this.findConfig();
        }
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        try {
            this.config = JSON.parse(fileContent);
        } catch (e) {
            throw new Error(`Could not parse piCtory configuration file: ${e.message}`);
        }
        return this.config;
    }
}

export default new Config();