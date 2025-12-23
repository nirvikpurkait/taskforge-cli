# Why `taskforge-cli`

Have you ever been frustrated of changing `env` variable for stanalone projects, where no build tools are used, or doesnot support loading `env` variables out of the box, and you Have to use packages like `dotenv`.

One down side is that for each mode (development / test / production), you have to keep changing the values according to the mode. Well `taskforge-cli` lets you do that out of the box.

You can achieve this with the help of a config file `tf.config.ts|js`, and as well as cli options.

## Config file

In config file you can `defult` export an `Config` object or a `defineConfig()` function which takes an object as a parameter or a function that returns an object as a parameter.

## How to use it

```json
// package.json

...
  "scripts": {
    "build": "tf build",                            // predefined script dev | build | test
    "foo": "tf custom foo",                         // custom script needs a "custom" keyword
    "bar": "tf custom bar",                         // custom script needs a "custom" keyword
    "bazz": "tf custom bazz --envFile ./.env.bazz", // custom script, loads ".env.bazz"
  },
...
```

```ts
export default defineConfig({
  scripts: {
    build: {
      execute: "node index.ts", // loads production env
    },
    foo: {
      execute: "node foo.ts", // loads ".env" by default unless specified
    },
    bar: {
      execute: "node bar.ts", // loads ".env.bar"
      envFile: "./env/.env.bar",
    },
  },
});
```

## Options:

### Config:

**cli option**: `--config`

**alias**: `-c`

**type**: `string`

**defult**: `process.cwd()`

If your config file is not at the root of your project, provide a relative path to the config file.

### Env file:

**cli option**: `--envFile`

**type**: `string`

Pass a specific env file for that script.

### Env directory:

**cli option**: `--envDir`

**type**: `string`

Pass a directory where your env files lives. It will load preferred `env` file depending on the script type.

If script is predefined i.e: dev | build | test, it will laod related `env` file, and if the script is custom it will load defult `.env` file.

### Executing command:

**cli option**: `--exec`

**type**: `string`

Pass a command that should execute for that script.
