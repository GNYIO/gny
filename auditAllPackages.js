const fs = require('fs');
const path = require('path');
const shellJS = require('shelljs');

const lernaJsonFilePath = path.join('.', 'lerna.json');
const lernaJSONFile = JSON.parse(fs.readFileSync(lernaJsonFilePath));

let errorOccured = false;

function stripDependencies(packageJson) {
  lernaJSONFile.packages.map(lernaPkg => {
    lernaPkg = lernaPkg.replace('packages', '@gny');

    if (lernaPkg in packageJson.dependencies) {
      delete packageJson.dependencies[lernaPkg];
    }
  });
  return packageJson;
}

function runNpmAuditInDir(dir) {
  const result = shellJS.exec('npm audit', {
    cwd: dir,
  });
  console.log(`\n\npackage: ${dir}\n${result.stdout}`);
  if (result.code > 0) {
    errorOccured = true;
  }
}

function auditRoot() {
  runNpmAuditInDir('.');
}

function auditPackages() {
  for (const pkg of lernaJSONFile.packages) {
    console.log(pkg);
    const packageJsonPath = path.join(pkg, 'package.json');
    const packageLockJsonPath = path.join(pkg, 'package-lock.json');
    const auditDirPath = path.join(pkg, 'audit');

    shellJS.exec(`rm -rf ${auditDirPath}`);

    const destinationPackageJsonPath = path.join(auditDirPath, 'package.json');
    const destinationPackageLockJsonPath = path.join(
      auditDirPath,
      'package-lock.json'
    );

    if (!fs.existsSync(packageLockJsonPath)) {
      console.log('skipping no package-lock.json file');
      continue; // Cannot audit a project without a lockfile
    }

    fs.mkdirSync(auditDirPath);
    fs.copyFileSync(packageJsonPath, destinationPackageJsonPath);
    fs.copyFileSync(packageLockJsonPath, destinationPackageLockJsonPath);

    const packageJsonContent = JSON.parse(
      fs.readFileSync(destinationPackageJsonPath)
    );
    const result = stripDependencies(packageJsonContent);
    fs.writeFileSync(
      destinationPackageJsonPath,
      JSON.stringify(result, null, 2)
    );

    runNpmAuditInDir(auditDirPath);

    shellJS.exec(`rm -rf ${auditDirPath}`);
  }
}

auditRoot();
auditPackages();

if (errorOccured) {
  throw new Error('npm audit error');
}
