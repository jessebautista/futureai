import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fg from 'fast-glob';

const execAsync = promisify(exec);

function assertWithinRepo(filePath: string, repoPath: string): string {
  const resolved = path.resolve(repoPath, filePath);
  const repoResolved = path.resolve(repoPath);
  if (!resolved.startsWith(repoResolved + path.sep) && resolved !== repoResolved) {
    throw new Error(`Path "${filePath}" is outside the repository root.`);
  }
  return resolved;
}

export const TOOL_DEFINITIONS: Record<string, Anthropic.Tool> = {
  Read: {
    name: 'Read',
    description: 'Read the contents of a file within the repository.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative or absolute path to the file to read (must be within the repo).',
        },
      },
      required: ['file_path'],
    },
  },

  Edit: {
    name: 'Edit',
    description: 'Perform an exact string replacement in a file within the repository.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative or absolute path to the file to edit (must be within the repo).',
        },
        old_string: {
          type: 'string',
          description: 'The exact string to find and replace.',
        },
        new_string: {
          type: 'string',
          description: 'The replacement string.',
        },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },

  Glob: {
    name: 'Glob',
    description: 'Find files in the repository matching a glob pattern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match files (e.g. "**/*.ts").',
        },
      },
      required: ['pattern'],
    },
  },

  Grep: {
    name: 'Grep',
    description: 'Search for a regex pattern across files in the repository.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'Regular expression to search for.',
        },
        include: {
          type: 'string',
          description: 'Optional glob pattern to restrict which files are searched (e.g. "**/*.ts").',
        },
      },
      required: ['pattern'],
    },
  },

  Bash: {
    name: 'Bash',
    description: 'Run a shell command in the repository directory with a 30-second timeout.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute.',
        },
      },
      required: ['command'],
    },
  },
};

type ToolInput = Record<string, unknown>;

export async function executeTool(name: string, input: ToolInput, repoPath: string): Promise<string> {
  switch (name) {
    case 'Read': {
      const filePath = input['file_path'] as string;
      const resolved = assertWithinRepo(filePath, repoPath);
      const contents = await fs.readFile(resolved, 'utf-8');
      return contents;
    }

    case 'Edit': {
      const filePath = input['file_path'] as string;
      const oldString = input['old_string'] as string;
      const newString = input['new_string'] as string;
      const resolved = assertWithinRepo(filePath, repoPath);
      const contents = await fs.readFile(resolved, 'utf-8');
      if (!contents.includes(oldString)) {
        throw new Error(`old_string not found in file: ${filePath}`);
      }
      const updated = contents.replace(oldString, newString);
      await fs.writeFile(resolved, updated, 'utf-8');
      return `Successfully edited ${filePath}`;
    }

    case 'Glob': {
      const pattern = input['pattern'] as string;
      const matches = await fg(pattern, {
        cwd: repoPath,
        dot: true,
        onlyFiles: true,
      });
      if (matches.length === 0) {
        return '(no files matched)';
      }
      return matches.join('\n');
    }

    case 'Grep': {
      const pattern = input['pattern'] as string;
      const include = (input['include'] as string | undefined) ?? '**/*';
      const regex = new RegExp(pattern);

      const files = await fg(include, {
        cwd: repoPath,
        dot: true,
        onlyFiles: true,
      });

      const results: string[] = [];

      for (const relFile of files) {
        const absFile = path.join(repoPath, relFile);
        let contents: string;
        try {
          contents = await fs.readFile(absFile, 'utf-8');
        } catch {
          continue;
        }
        const lines = contents.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push(`${relFile}:${i + 1}: ${lines[i]}`);
          }
        }
      }

      if (results.length === 0) {
        return '(no matches found)';
      }
      return results.join('\n');
    }

    case 'Bash': {
      const command = input['command'] as string;
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: repoPath,
          timeout: 30000,
        });
        const output = [stdout, stderr].filter(Boolean).join('\n');
        return output || '(command completed with no output)';
      } catch (err: unknown) {
        const error = err as { stdout?: string; stderr?: string; message?: string };
        const output = [error.stdout, error.stderr, error.message].filter(Boolean).join('\n');
        return `Error: ${output}`;
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
