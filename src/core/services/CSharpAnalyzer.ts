// NO NPM IMPORT! We bypass Vite completely and use Native browser ESM loading.

export interface SyntaxNode {
  type: string;
  text: string;
  childCount: number;
  children: SyntaxNode[];
  child(index: number): SyntaxNode | null;
}

export interface Tree {
  rootNode: SyntaxNode;
  delete(): void;
}

export interface TypeContract {
  name: string;
  baseClass: string | null;
  interfaces: string[];
}

export interface FileMetaData {
  classes: TypeContract[];
  interfaces: TypeContract[];
  structs: TypeContract[];
  records: TypeContract[];
  enums: string[];
  delegates: string[];
  publicMethods: string[];
  publicProperties: string[];
  publicFields: string[];
  usedTypes: Set<string>;
}

class CSharpAnalyzerService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parser: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const origin = typeof location !== 'undefined' ? location.origin : '';
        const scriptUrl = origin + '/web-tree-sitter.js';

        const TreeSitterModule = await import(/* @vite-ignore */ scriptUrl);

        const Parser = TreeSitterModule.Parser;
        const Language = TreeSitterModule.Language;

        if (!Parser || !Language) {
            throw new Error("Failed to extract Parser or Language classes from web-tree-sitter.js");
        }

        await Parser.init({
          locateFile(scriptName: string) {
            if (scriptName.includes('web-tree-sitter.wasm')) return '/web-tree-sitter.wasm';
            if (scriptName.includes('tree-sitter.wasm')) return '/tree-sitter.wasm';
            return '/' + scriptName;
          },
        });
        
        this.parser = new Parser();
        const language = await Language.load('/tree-sitter-c_sharp.wasm');
        this.parser.setLanguage(language);
        
        this.isInitialized = true;
      } catch (err) {
        console.warn("[CSharpAnalyzer] Engine initialization failed:", err);
        throw err; 
      }
    })();

    return this.initPromise;
  }

  parseFile(text: string): FileMetaData | null {
    if (!this.parser) return null;

    const meta: FileMetaData = {
      classes: [],
      interfaces: [],
      structs: [],
      records: [],
      enums: [],
      delegates: [],
      publicMethods: [],
      publicProperties: [],
      publicFields: [],
      usedTypes: new Set(),
    };

    let tree: Tree | null = null;
    try {
      tree = this.parser.parse(text);
      if (!tree) return null; 
      
      this.walkSyntax(tree.rootNode, meta);
      return meta;
    } catch (err) {
      console.warn("[CSharpAnalyzer] AST Parsing failed for file:", err);
      return null;
    } finally {
      if (tree) tree.delete();
    }
  }

  private isInterfaceConvention(name: string): boolean {
    return name.length > 1 && name[0] === 'I' && name[1] === name[1].toUpperCase();
  }

  private extractTypeContract(node: SyntaxNode): TypeContract | null {
    const nameNode = node.children.find((c: SyntaxNode) => c.type === 'identifier');
    if (!nameNode) return null;

    const baseList = node.children.find((c: SyntaxNode) => c.type === 'base_list');

    let baseClass: string | null = null;
    const interfaces: string[] = [];

    if (baseList) {
      for (let i = 0; i < baseList.childCount; i++) {
        const child = baseList.child(i);
        if (child && child.type !== ':' && child.type !== ',') {
          const typeName = child.text.trim();
          if (this.isInterfaceConvention(typeName)) {
            interfaces.push(typeName);
          } else {
            baseClass = typeName;
          }
        }
      }
    }

    return { name: nameNode.text, baseClass, interfaces };
  }

  private walkSyntax(node: SyntaxNode, meta: FileMetaData) {
    // 1. Classes
    if (node.type === 'class_declaration') {
      const contract = this.extractTypeContract(node);
      if (contract) meta.classes.push(contract);
    }
    // 2. Interfaces
    else if (node.type === 'interface_declaration') {
      const contract = this.extractTypeContract(node);
      if (contract) meta.interfaces.push(contract);
    }
    // 3. Structs (including readonly struct, ref struct)
    else if (node.type === 'struct_declaration') {
      const contract = this.extractTypeContract(node);
      if (contract) meta.structs.push(contract);
    }
    // 4. Records (Record Class / Record Struct)
    else if (node.type === 'record_declaration' || node.type === 'record_struct_declaration') {
      const contract = this.extractTypeContract(node);
      if (contract) meta.records.push(contract);
    }
    // 5. Enums
    else if (node.type === 'enum_declaration') {
      const nameNode = node.children.find((c: SyntaxNode) => c.type === 'identifier');
      if (nameNode) meta.enums.push(nameNode.text);
    }
    // 6. Delegates
    else if (node.type === 'delegate_declaration') {
      const nameNode = node.children.find((c: SyntaxNode) => c.type === 'identifier');
      if (nameNode) meta.delegates.push(nameNode.text);
    }
    // 7. Methods & Constructors
    else if (node.type === 'method_declaration' || node.type === 'constructor_declaration') {
      const hasPublic = node.children.some((c: SyntaxNode) => c.type === 'modifier' && c.text === 'public');

      if (hasPublic || node.type === 'constructor_declaration') {
        let returnType = '';
        let name = '';
        let params = '()';

        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (!c) continue;
          
          if (c.type === 'identifier') {
            name = c.text;
          } else if (c.type === 'parameter_list') {
            params = c.text.replace(/\s+/g, ' ');
          } else if (
            c.type !== 'modifier' && 
            c.type !== 'block' && 
            c.type !== 'type_parameter_list' && 
            c.type !== 'attribute_list' &&
            !name
          ) {
            returnType = c.text;
          }
        }

        if (name) {
          const sig = `${returnType ? returnType + ' ' : ''}${name}${params}`.trim();
          meta.publicMethods.push(sig);
        }
      }
    }
    // 8. Properties
    else if (node.type === 'property_declaration') {
      const hasPublic = node.children.some((c: SyntaxNode) => c.type === 'modifier' && c.text === 'public');
      if (hasPublic) {
        let type = '';
        let name = '';
        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (!c) continue;
          if (c.type === 'identifier') name = c.text;
          else if (c.type !== 'modifier' && c.type !== 'accessor_list' && c.type !== 'attribute_list' && !name) type = c.text;
        }
        if (name && type) meta.publicProperties.push(`${type} ${name}`);
      }
    }
    // 9. Fields
    else if (node.type === 'field_declaration') {
      const hasPublic = node.children.some((c: SyntaxNode) => c.type === 'modifier' && c.text === 'public');
      if (hasPublic) {
        let type = '';
        let name = '';
        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (!c) continue;
          if (c.type === 'variable_declaration') {
            for (let j = 0; j < c.childCount; j++) {
              const vChild = c.child(j);
              if (!vChild) continue;
              if (vChild.type === 'variable_declarator') {
                 const idNode = vChild.children.find((vc: SyntaxNode) => vc.type === 'identifier');
                 if (idNode) name = idNode.text;
              } else if (vChild.type !== ',') {
                 type = vChild.text;
              }
            }
          }
        }
        if (name && type) meta.publicFields.push(`${type} ${name}`);
      }
    }

    // Collect all identifiers for global dependency resolution
    if (node.type === 'identifier') {
      meta.usedTypes.add(node.text);
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.walkSyntax(child, meta);
      }
    }
  }

  private formatTypeContracts(contracts: TypeContract[]): string {
    return contracts.map(c => {
      let str = c.name;
      if (c.baseClass) str += ` : ${c.baseClass}`;
      if (c.interfaces.length > 0) str += ` (${c.interfaces.join(', ')})`;
      return str;
    }).join(' | ');
  }

  formatTreeMetaData(meta: FileMetaData, globalRegistry: Set<string>): string {
    // Collect all types defined strictly in this file so it does not depend on itself
    const ownTypes = new Set<string>([
      ...meta.classes.map(c => c.name),
      ...meta.interfaces.map(i => i.name),
      ...meta.structs.map(s => s.name),
      ...meta.records.map(r => r.name),
      ...meta.enums,
      ...meta.delegates
    ]);

    const dependencies = Array.from(meta.usedTypes).filter(type => 
      globalRegistry.has(type) && !ownTypes.has(type)
    );

    const parts: string[] = [];

    if (meta.classes.length > 0) {
      parts.push(`Classes: ${this.formatTypeContracts(meta.classes)}`);
    }

    if (meta.interfaces.length > 0) {
      parts.push(`Interfaces: ${this.formatTypeContracts(meta.interfaces)}`);
    }

    if (meta.structs.length > 0) {
      parts.push(`Structs: ${this.formatTypeContracts(meta.structs)}`);
    }

    if (meta.records.length > 0) {
      parts.push(`Records: ${this.formatTypeContracts(meta.records)}`);
    }

    if (meta.enums.length > 0) {
      parts.push(`Enums: ${meta.enums.join(', ')}`);
    }

    if (meta.delegates.length > 0) {
      parts.push(`Delegates: ${meta.delegates.join(', ')}`);
    }

    if (meta.publicFields.length > 0) {
      parts.push(`Fields: ${meta.publicFields.join(', ')}`);
    }

    if (meta.publicProperties.length > 0) {
      parts.push(`Props: ${meta.publicProperties.join(', ')}`);
    }

    if (meta.publicMethods.length > 0) {
      const maxMethods = 5;
      const methodsToShow = meta.publicMethods.slice(0, maxMethods);
      const suffix = meta.publicMethods.length > maxMethods ? `, ... +${meta.publicMethods.length - maxMethods}` : '';
      parts.push(`Methods: ${methodsToShow.join(', ')}${suffix}`);
    }

    if (dependencies.length > 0) {
      parts.push(`Deps: ${dependencies.join(', ')}`);
    }

    if (parts.length === 0) return ''; 

    return ` -> [ ${parts.join(' ✦ ')} ]`;
  }
}

export const csharpAnalyzer = new CSharpAnalyzerService();