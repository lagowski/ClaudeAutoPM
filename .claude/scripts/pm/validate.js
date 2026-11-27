const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../../lib/frontmatter');

/**
 * PM System Validation Script
 * Enhanced with AUTO-FIXED / NEEDS INPUT format and template validation.
 */

async function validate() {
  const result = {
    errors: 0,
    warnings: 0,
    invalidFiles: 0,
    autoFixed: [],
    needsInput: [],
    messages: [],
    exitCode: 0
  };

  function addMessage(message) {
    result.messages.push(message);
    if (require.main === module) {
      console.log(message);
    }
  }

  // Helper: read frontmatter from a file using shared lib
  function readFrontmatter(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    const hasFrontmatter = content.trimStart().startsWith('---');
    return { fm: frontmatter, body, raw: content, hasFrontmatter };
  }

  // Helper: write back frontmatter fix (scoped to frontmatter block only)
  function writeFrontmatterFix(filePath, fieldName, newValue) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(^---\r?\n?)/m);

    if (!fmMatch) {
      // No frontmatter block — insert one
      const updated = `---\n${fieldName}: ${newValue}\n---\n${content}`;
      fs.writeFileSync(filePath, updated, 'utf8');
      return;
    }

    const before = fmMatch[1];
    let fmBlock = fmMatch[2];
    const after = fmMatch[3];
    const rest = content.slice(fmMatch[0].length);

    const fieldRegex = new RegExp(`^(${fieldName}:\\s*)(.*)$`, 'm');
    if (fieldRegex.test(fmBlock)) {
      fmBlock = fmBlock.replace(fieldRegex, `$1${newValue}`);
    } else {
      fmBlock += `${fieldName}: ${newValue}\n`;
    }

    fs.writeFileSync(filePath, before + fmBlock + after + rest, 'utf8');
  }

  const now = new Date().toISOString();

  // Check directory structure
  try {
    if (!fs.existsSync('.claude') || !fs.statSync('.claude').isDirectory()) {
      result.errors++;
      result.needsInput.push('[.claude] Directory missing — run /pm:init');
      addMessage('');
      addMessage(`## Pre-Landing Review: 1 issues (0 auto-fixed, 1 needs input)`);
      addMessage('');
      addMessage('**NEEDS INPUT:**');
      addMessage('- [.claude] Directory missing — run /pm:init');
      return result;
    }
  } catch (err) {
    result.errors++;
  }

  // Scan PRDs and epics for frontmatter issues
  const filesToCheck = [];

  try {
    if (fs.existsSync('.claude/prds')) {
      const prdFiles = fs.readdirSync('.claude/prds').filter(f => f.endsWith('.md'));
      for (const f of prdFiles) filesToCheck.push(path.join('.claude/prds', f));
    }
  } catch { /* skip */ }

  try {
    if (fs.existsSync('.claude/epics')) {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);

      for (const epicDir of epicDirs) {
        const epicPath = path.join('.claude/epics', epicDir);
        const files = fs.readdirSync(epicPath).filter(f => f.endsWith('.md'));
        for (const f of files) filesToCheck.push(path.join(epicPath, f));
      }
    }
  } catch { /* skip */ }

  // Validate each file
  for (const filePath of filesToCheck) {
    try {
      const { fm, body, hasFrontmatter } = readFrontmatter(filePath);
      const rel = filePath;

      if (!hasFrontmatter) {
        result.needsInput.push(`[${rel}] Missing frontmatter`);
        result.invalidFiles++;
        continue;
      }

      // AUTO-FIX: missing updated timestamp
      if (!fm.updated || fm.updated === '') {
        writeFrontmatterFix(filePath, 'updated', now);
        result.autoFixed.push(`[${rel}] Missing 'updated' → set to ${now}`);
      }

      // AUTO-FIX: wrong case in status field
      const validStatuses = ['backlog', 'in-progress', 'in_progress', 'complete', 'completed', 'done', 'open', 'closed', 'active', 'blocked', 'draft', 'review', 'approved', 'rejected'];
      if (fm.status) {
        const lower = fm.status.toLowerCase();
        if (fm.status !== lower && validStatuses.includes(lower)) {
          writeFrontmatterFix(filePath, 'status', lower);
          result.autoFixed.push(`[${rel}] Status '${fm.status}' → normalized to '${lower}'`);
        }
      }

      // NEEDS INPUT: check required sections via XML templates
      try {
        const templateReader = require(path.join(process.cwd(), '.claude', 'lib', 'template-reader'));

        // Determine template type based on path (normalize separators for Windows)
        const normalizedPath = filePath.split(path.sep).join('/');
        let templateName = null;
        if (normalizedPath.includes('/prds/')) templateName = 'prd.xml';
        else if (normalizedPath.endsWith('epic.md')) templateName = 'epic.xml';
        else if (/\/\d+.*\.md$/.test(normalizedPath)) templateName = 'issue.xml';

        if (templateName) {
          const templatePath = templateReader.resolveTemplatePath(templateName, process.cwd());
          if (fs.existsSync(templatePath)) {
            const template = templateReader.readTemplate(templatePath);
            const content = fs.readFileSync(filePath, 'utf8');
            const validation = templateReader.validateContent(template, content);

            for (const error of validation.errors) {
              result.needsInput.push(`[${rel}] ${error}`);
            }
          }
        }
      } catch { /* template reader not available, skip template checks */ }

      // NEEDS INPUT: empty goal/objective sections
      if (body) {
        const goalMatch = body.match(/^##\s*(?:Goal|Objective)\s*\n([\s\S]*?)(?=\n##|\n$|$)/mi);
        if (goalMatch && !goalMatch[1].trim()) {
          result.needsInput.push(`[${rel}] Empty goal/objective section`);
        }
      }

    } catch { /* skip unreadable files */ }
  }

  // Reference check (from original)
  try {
    if (fs.existsSync('.claude/epics')) {
      const epicDirs = fs.readdirSync('.claude/epics', { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);

      for (const epicDir of epicDirs) {
        const epicPath = path.join('.claude/epics', epicDir);
        if (!fs.existsSync(epicPath)) continue;

        // Check for missing epic.md
        if (!fs.existsSync(path.join(epicPath, 'epic.md'))) {
          result.needsInput.push(`[${epicPath}] Missing epic.md`);
        }

        const files = fs.readdirSync(epicPath, { withFileTypes: true })
          .filter(d => d.isFile() && /^\d+.*\.md$/.test(d.name)).map(d => d.name);

        for (const taskFile of files) {
          try {
            const content = fs.readFileSync(path.join(epicPath, taskFile), 'utf8');
            const depsMatch = content.match(/^depends_on:\s*\[(.*?)\]/m);
            if (depsMatch && depsMatch[1].trim()) {
              const deps = depsMatch[1].split(',').map(d => d.trim()).filter(Boolean);
              for (const dep of deps) {
                if (!fs.existsSync(path.join(epicPath, `${dep}.md`))) {
                  result.needsInput.push(`[${path.join(epicPath, taskFile)}] References missing task: ${dep}`);
                }
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }

  // Output results
  const totalIssues = result.autoFixed.length + result.needsInput.length;

  addMessage('');
  addMessage(`## Pre-Landing Review: ${totalIssues} issues (${result.autoFixed.length} auto-fixed, ${result.needsInput.length} needs input)`);

  if (result.autoFixed.length > 0) {
    addMessage('');
    addMessage('**AUTO-FIXED:**');
    for (const fix of result.autoFixed) {
      addMessage(`- ${fix}`);
    }
  }

  if (result.needsInput.length > 0) {
    addMessage('');
    addMessage('**NEEDS INPUT:**');
    for (const issue of result.needsInput) {
      addMessage(`- ${issue}`);
    }
  }

  if (totalIssues === 0) {
    addMessage('');
    addMessage('✅ All checks passed');
  }

  result.errors = result.needsInput.length;
  result.warnings = result.autoFixed.length;
  result.exitCode = 0;

  return result;
}

module.exports = validate;

if (require.main === module) {
  validate().then(result => {
    process.exit(result.exitCode);
  }).catch(err => {
    console.error('Validation failed:', err.message);
    process.exit(1);
  });
}
