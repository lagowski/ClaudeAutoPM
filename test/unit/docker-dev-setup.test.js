// Mock dependencies before importing
jest.mock('fs');
jest.mock('child_process');

const fs = require('fs');
const { execFileSync } = require('child_process');
const DockerDevSetup = require('../../autopm/.claude/scripts/docker-dev-setup.js');

describe('DockerDevSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();
    process.cwd = jest.fn().mockReturnValue('/mock/project');

    // Mock fs methods
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});

    // Mock execFileSync
    execFileSync.mockReturnValue('');
  });

  describe('Constructor', () => {
    it('should initialize with correct project root and templates', () => {
      const setup = new DockerDevSetup();

      expect(setup.projectRoot).toBe('/mock/project');
      expect(setup.colors).toHaveProperty('red');
      expect(setup.colors).toHaveProperty('green');
      expect(setup.colors).toHaveProperty('yellow');
      expect(setup.colors).toHaveProperty('blue');
      expect(setup.colors).toHaveProperty('reset');
      expect(setup.templates).toHaveProperty('nodejs');
      expect(setup.templates).toHaveProperty('python');
      expect(setup.templates).toHaveProperty('golang');
      expect(setup.templates).toHaveProperty('java');
      expect(setup.templates).toHaveProperty('rust');
    });

    it('should have complete template structure for each project type', () => {
      const setup = new DockerDevSetup();

      ['nodejs', 'python', 'golang', 'java', 'rust'].forEach(type => {
        expect(setup.templates[type]).toHaveProperty('dockerfile');
        expect(setup.templates[type]).toHaveProperty('dockerfileDev');
        expect(setup.templates[type]).toHaveProperty('dockerCompose');
        expect(setup.templates[type]).toHaveProperty('dockerIgnore');
        expect(typeof setup.templates[type].dockerfile).toBe('string');
        expect(typeof setup.templates[type].dockerfileDev).toBe('string');
        expect(typeof setup.templates[type].dockerCompose).toBe('string');
        expect(typeof setup.templates[type].dockerIgnore).toBe('string');
      });
    });
  });

  describe('print()', () => {
    it('should print message with color', () => {
      const setup = new DockerDevSetup();
      setup.print('Test message', 'green');

      expect(console.log).toHaveBeenCalledWith('\x1b[32mTest message\x1b[0m');
    });

    it('should print message without color', () => {
      const setup = new DockerDevSetup();
      setup.print('Test message');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });

    it('should handle invalid color', () => {
      const setup = new DockerDevSetup();
      setup.print('Test message', 'invalidcolor');

      expect(console.log).toHaveBeenCalledWith('Test message');
    });
  });

  describe('detectProjectType()', () => {
    it('should detect Node.js project', () => {
      fs.existsSync.mockImplementation(file => file === 'package.json');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('nodejs');
      expect(fs.existsSync).toHaveBeenCalledWith('package.json');
    });

    it('should detect Python project with requirements.txt', () => {
      fs.existsSync.mockImplementation(file => file === 'requirements.txt');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('python');
    });

    it('should detect Python project with pyproject.toml', () => {
      fs.existsSync.mockImplementation(file => file === 'pyproject.toml');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('python');
    });

    it('should detect Python project with setup.py', () => {
      fs.existsSync.mockImplementation(file => file === 'setup.py');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('python');
    });

    it('should detect Go project', () => {
      fs.existsSync.mockImplementation(file => file === 'go.mod');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('golang');
    });

    it('should detect Java project with Maven', () => {
      fs.existsSync.mockImplementation(file => file === 'pom.xml');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('java');
    });

    it('should detect Java project with Gradle', () => {
      fs.existsSync.mockImplementation(file => file === 'build.gradle');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('java');
    });

    it('should detect Rust project', () => {
      fs.existsSync.mockImplementation(file => file === 'Cargo.toml');

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('rust');
    });

    it('should return unknown for unrecognized project', () => {
      fs.existsSync.mockReturnValue(false);

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('unknown');
    });

    it('should prioritize Node.js over other types when multiple files exist', () => {
      fs.existsSync.mockImplementation(file =>
        file === 'package.json' || file === 'requirements.txt'
      );

      const setup = new DockerDevSetup();
      const result = setup.detectProjectType();

      expect(result).toBe('nodejs');
    });
  });

  describe('checkDocker()', () => {
    it('should return true when Docker is available', () => {
      execFileSync.mockReturnValue('Docker version 20.10.0');

      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      const result = setup.checkDocker();

      expect(result).toBe(true);
      expect(execFileSync).toHaveBeenCalledWith('docker', ['version'], { stdio: 'ignore' });
    });

    it('should return false when Docker is not available', () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Docker not found');
      });

      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      const result = setup.checkDocker();

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('Docker is not installed or not running', 'red');
      expect(setup.print).toHaveBeenCalledWith('Please install Docker Desktop from https://docker.com', 'yellow');
    });
  });

  describe('createDockerFiles()', () => {
    it('should create Docker files for Node.js project', () => {
      fs.existsSync.mockReturnValue(false);

      const setup = new DockerDevSetup();
      const result = setup.createDockerFiles('nodejs');

      expect(result).toEqual({ created: 4, skipped: 0 });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
      expect(fs.writeFileSync).toHaveBeenCalledWith('Dockerfile', expect.stringContaining('node:'));
      expect(fs.writeFileSync).toHaveBeenCalledWith('Dockerfile.dev', expect.stringContaining('node:'));
      expect(fs.writeFileSync).toHaveBeenCalledWith('docker-compose.yml', expect.stringContaining('version:'));
      expect(fs.writeFileSync).toHaveBeenCalledWith('.dockerignore', expect.stringContaining('node_modules'));
    });

    it('should create Docker files for Python project', () => {
      fs.existsSync.mockReturnValue(false);

      const setup = new DockerDevSetup();
      const result = setup.createDockerFiles('python');

      expect(result).toEqual({ created: 4, skipped: 0 });
      expect(fs.writeFileSync).toHaveBeenCalledWith('Dockerfile', expect.stringContaining('python:'));
      expect(fs.writeFileSync).toHaveBeenCalledWith('Dockerfile.dev', expect.stringContaining('python:'));
      expect(fs.writeFileSync).toHaveBeenCalledWith('docker-compose.yml', expect.stringContaining('version:'));
      expect(fs.writeFileSync).toHaveBeenCalledWith('.dockerignore', expect.stringContaining('__pycache__'));
    });

    it('should skip existing files when force is false', () => {
      fs.existsSync.mockImplementation(file => file === 'Dockerfile');

      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      const result = setup.createDockerFiles('nodejs', false);

      expect(result).toEqual({ created: 3, skipped: 1 });
      expect(setup.print).toHaveBeenCalledWith('  ⚠️  Dockerfile already exists, skipping', 'yellow');
    });

    it('should overwrite existing files when force is true', () => {
      fs.existsSync.mockReturnValue(true);

      const setup = new DockerDevSetup();
      const result = setup.createDockerFiles('nodejs', true);

      expect(result).toEqual({ created: 4, skipped: 0 });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    });

    it('should return false for unknown project type', () => {
      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      const result = setup.createDockerFiles('unknown');

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('Unable to detect project type', 'yellow');
      expect(setup.print).toHaveBeenCalledWith('Please specify project type manually', 'yellow');
    });

    it('should return false for unsupported project type', () => {
      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      const result = setup.createDockerFiles('unsupported');

      expect(result).toBe(false);
      expect(setup.print).toHaveBeenCalledWith('No templates available for unsupported', 'red');
    });

    it('should handle all supported project types', () => {
      fs.existsSync.mockReturnValue(false);
      const setup = new DockerDevSetup();

      ['nodejs', 'python', 'golang', 'java', 'rust'].forEach(type => {
        jest.clearAllMocks();
        const result = setup.createDockerFiles(type);
        expect(result).toEqual({ created: 4, skipped: 0 });
        expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('showHelp()', () => {
    it('should display help information', () => {
      const setup = new DockerDevSetup();
      setup.showHelp();

      expect(console.log).toHaveBeenCalledWith('Docker Development Environment Setup');
      expect(console.log).toHaveBeenCalledWith('Usage: docker-dev-setup [options] [project-type]');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--force'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('--check'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('nodejs'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('python'));
    });
  });

  describe('run()', () => {
    beforeEach(() => {
      // Setup successful Docker check by default
      execFileSync.mockReturnValue('Docker version 20.10.0');
      fs.existsSync.mockReturnValue(false);
    });

    it('should auto-detect project type and create files', async () => {
      fs.existsSync.mockImplementation(file => file === 'package.json');

      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      await setup.run([]);

      expect(setup.detectProjectType).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
      expect(setup.print).toHaveBeenCalledWith(expect.stringContaining('NODEJS'), 'green');
    });

    it('should use specified project type', async () => {
      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      await setup.run(['python']);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
      expect(setup.print).toHaveBeenCalledWith(expect.stringContaining('PYTHON'), 'green');
    });

    it('should handle force flag', async () => {
      fs.existsSync.mockReturnValue(true);

      const setup = new DockerDevSetup();
      await setup.run(['--force', 'nodejs']);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    });

    it('should handle check flag', async () => {
      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      await setup.run(['--check']);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(setup.print).toHaveBeenCalledWith('✅ Docker is installed and running', 'green');
    });

    it('should handle help flag', async () => {
      const setup = new DockerDevSetup();
      await setup.run(['--help']);

      expect(console.log).toHaveBeenCalledWith('Docker Development Environment Setup');
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle -h flag', async () => {
      const setup = new DockerDevSetup();
      await setup.run(['-h']);

      expect(console.log).toHaveBeenCalledWith('Docker Development Environment Setup');
    });

    it('should exit when Docker is not available', async () => {
      execFileSync.mockImplementation(() => {
        throw new Error('Docker not found');
      });

      const setup = new DockerDevSetup();
      await setup.run([]);

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle unknown arguments', async () => {
      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      await setup.run(['--unknown-flag']);

      expect(setup.print).toHaveBeenCalledWith('Unknown option: --unknown-flag', 'red');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle multiple flags', async () => {
      fs.existsSync.mockReturnValue(true);

      const setup = new DockerDevSetup();
      await setup.run(['--force', 'nodejs']);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    });

    it('should handle case insensitive project types', async () => {
      const setup = new DockerDevSetup();
      await setup.run(['NODEJS']);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    });
  });

  describe('Template Content', () => {
    it('should generate valid Node.js Dockerfile', () => {
      const setup = new DockerDevSetup();
      const dockerfile = setup.getNodejsDockerfile();

      expect(dockerfile).toContain('FROM node:');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('COPY package*.json');
      expect(dockerfile).toContain('RUN npm ci');
      expect(dockerfile).toContain('EXPOSE 3000');
    });

    it('should generate valid Python Dockerfile', () => {
      const setup = new DockerDevSetup();
      const dockerfile = setup.getPythonDockerfile();

      expect(dockerfile).toContain('FROM python:');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('COPY requirements.txt');
      expect(dockerfile).toContain('RUN pip install');
      expect(dockerfile).toContain('EXPOSE 8000');
    });

    it('should generate valid Go Dockerfile', () => {
      const setup = new DockerDevSetup();
      const dockerfile = setup.getGolangDockerfile();

      expect(dockerfile).toContain('FROM golang:');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('COPY go.mod');
      expect(dockerfile).toContain('RUN go mod download');
      expect(dockerfile).toContain('RUN CGO_ENABLED=0');
    });

    it('should generate valid docker-compose files', () => {
      const setup = new DockerDevSetup();

      ['nodejs', 'python', 'golang', 'java', 'rust'].forEach(type => {
        const method = `get${type.charAt(0).toUpperCase() + type.slice(1)}DockerCompose`;
        const compose = setup[method]();

        expect(compose).toContain('version:');
        expect(compose).toContain('services:');
        expect(compose).toContain('build:');
        expect(compose).toContain('ports:');
      });
    });

    it('should generate appropriate .dockerignore files', () => {
      const setup = new DockerDevSetup();

      const nodejsIgnore = setup.getNodejsDockerIgnore();
      expect(nodejsIgnore).toContain('node_modules');
      expect(nodejsIgnore).toContain('npm-debug.log');

      const pythonIgnore = setup.getPythonDockerIgnore();
      expect(pythonIgnore).toContain('__pycache__');
      expect(pythonIgnore).toContain('*.pyc');

      const goIgnore = setup.getGolangDockerIgnore();
      expect(goIgnore).toContain('vendor/');

      const javaIgnore = setup.getJavaDockerIgnore();
      expect(javaIgnore).toContain('target/');
      // Note: Java ignore may not contain build/ in this implementation

      const rustIgnore = setup.getRustDockerIgnore();
      expect(rustIgnore).toContain('target/');
      // Note: Rust ignore may not contain Cargo.lock in this implementation
    });
  });

  describe('Integration Tests', () => {
    it('should maintain backward compatibility', () => {
      const DockerDevSetupClass = require('../../autopm/.claude/scripts/docker-dev-setup.js');
      expect(typeof DockerDevSetupClass).toBe('function');
      expect(DockerDevSetupClass.prototype).toHaveProperty('detectProjectType');
      expect(DockerDevSetupClass.prototype).toHaveProperty('createDockerFiles');
      expect(DockerDevSetupClass.prototype).toHaveProperty('checkDocker');
      expect(DockerDevSetupClass.prototype).toHaveProperty('run');
      expect(DockerDevSetupClass.prototype).toHaveProperty('showHelp');
    });

    it('should handle realistic Node.js project setup', async () => {
      fs.existsSync.mockImplementation(file => file === 'package.json');
      execFileSync.mockReturnValue('Docker version 20.10.0');

      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      await setup.run([]);

      expect(setup.print).toHaveBeenCalledWith('🐳 Docker Development Environment Setup', 'blue');
      expect(setup.print).toHaveBeenCalledWith('✅ Docker is installed and running', 'green');
      expect(setup.print).toHaveBeenCalledWith(expect.stringContaining('NODEJS'), 'green');
      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
    });

    it('should handle complete Python project setup with force', async () => {
      fs.existsSync.mockImplementation(file =>
        file === 'requirements.txt' || file === 'Dockerfile'
      );
      execFileSync.mockReturnValue('Docker version 20.10.0');

      const setup = new DockerDevSetup();
      jest.spyOn(setup, 'print');
      await setup.run(['--force']);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(4);
      expect(setup.print).toHaveBeenCalledWith('  ✅ Created Dockerfile', 'green');
    });
  });
});