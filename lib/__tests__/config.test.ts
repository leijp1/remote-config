import ConfigParser, {Config} from "../config";

jest.mock("../logger/logger", () => {
    return {
        Logger: {
            info: jest.fn(),
            warning: jest.fn(),
            error: jest.fn()
        }
    }
})

jest.mock("node-ssh", () => {
    return {
        NodeSSH: jest.fn().mockImplementation(() => {
            return {
                connect: jest.fn().mockResolvedValue({}),
                exec: jest.fn().mockResolvedValue({}),
                execCommand: jest.fn().mockResolvedValue({}),
                putFiles: jest.fn().mockResolvedValue({})
            }
        })
    }
})

test("Simple test with concurrency 1", async () => {
    let config = new ConfigParser({filePath: "/", concurrency: 3})

    config.config = {
        logger: undefined, login: {username: "user", password: "pass"},
        name: "Test",
        output: false,
        concurrency: 1,
        steps: [{
            name: "My Command",
            run: "ls"
        }],
        remote: ["1", "2"]
    }

    let results = await config.runRemoteCommand();
    expect(results?.length).toBe(2)
    expect(results![0][0].type).toBe("command")
})

test("Simple test with concurrency 2", async () => {
    let config = new ConfigParser({filePath: "/", concurrency: 3})

    config.config = {
        logger: undefined, login: {username: "user", password: "pass"},
        name: "Test",
        output: false,
        concurrency: 2,
        steps: [{
            name: "My Command",
            run: "ls"
        }],
        remote: ["1", "2"]
    }

    let results = await config.runRemoteCommand();
    expect(results?.length).toBe(2)
})

test("test put files", async () => {
    let config = new ConfigParser({filePath: "/", concurrency: 3})

    config.config = {
        logger: undefined, login: {username: "user", password: "pass"},
        name: "Test",
        output: false,
        concurrency: 2,
        steps: [{
          files: [{
              local: "/a",
              remote: "/a"
          }]
        }],
        remote: ["1", "2"]
    }

    let results = await config.runRemoteCommand();
    expect(results?.length).toBe(2)
})


test("test put files with {index}", async () => {
    let config = new ConfigParser({filePath: "/", concurrency: 3})

    config.config = {
        logger: undefined, login: {username: "user", password: "pass"},
        name: "Test",
        output: false,
        concurrency: 2,
        steps: [{
            files: [{
                local: "/a-{index}.md",
                remote: "/a"
            }]
        }],
        remote: ["1", "2"]
    }

    let results = await config.runRemoteCommand();
    expect(results?.length).toBe(2)
    expect(results![0][0].files![0].local).toBe("/a-0.md")
    expect(results![1][0].files![0].local).toBe("/a-1.md")
})
