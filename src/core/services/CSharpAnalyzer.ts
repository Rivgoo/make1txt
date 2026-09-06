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

export interface FileMetaData {
  classes: Array<{ name: string; inherits: string[] }>;
  publicMethods: string[];
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
      publicMethods: [],
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

  private walkSyntax(node: SyntaxNode, meta: FileMetaData) {
    if (node.type === 'class_declaration' || node.type === 'interface_declaration' || node.type === 'record_declaration') {
      const nameNode = node.children.find((c: SyntaxNode) => c.type === 'identifier');
      const baseList = node.children.find((c: SyntaxNode) => c.type === 'base_list');

      const inherits: string[] = [];
      if (baseList) {
        for (let i = 0; i < baseList.childCount; i++) {
          const child = baseList.child(i);
          if (child && child.type !== ':' && child.type !== ',') {
            inherits.push(child.text.trim());
          }
        }
      }

      if (nameNode) {
        meta.classes.push({ name: nameNode.text, inherits });
      }
    } 
    else if (node.type === 'method_declaration' || node.type === 'constructor_declaration') {
      const hasPublic = node.children.some((c: SyntaxNode) => c.type === 'modifier' && c.text === 'public');

      if (hasPublic) {
        let returnType = '';
        let name = '';
        let params = '()';

        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (!c) continue;
          
          if (c.type === 'identifier') {
            name = c.text;
          } else if (c.type === 'parameter_list') {
            // Strip out newlines and extra spaces from parameters
            params = c.text.replace(/\s+/g, ' ');
          } else if (
            c.type !== 'modifier' && 
            c.type !== 'block' && 
            c.type !== 'type_parameter_list' && 
            c.type !== 'attribute_list' &&
            !name
          ) {
            // Heuristically, types come before the identifier
            returnType = c.text;
          }
        }

        if (name) {
          const sig = `${returnType ? returnType + ' ' : ''}${name}${params}`.trim();
          meta.publicMethods.push(sig);
        }
      }
    }

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

  /**
   * Formats the metadata as a single-line string to be appended 
   * to the file name in the Directory Structure tree.
   */
  formatTreeMetaData(meta: FileMetaData, globalRegistry: Set<string>): string {
    const dependencies = Array.from(meta.usedTypes).filter(type => 
      globalRegistry.has(type) && !meta.classes.some(c => c.name === type)
    );

    const parts: string[] = [];

    if (meta.classes.length > 0) {
      const classStrings = meta.classes.map(c => 
        c.inherits.length > 0 ? `${c.name} : ${c.inherits.join(', ')}` : c.name
      );
      parts.push(`Classes: ${classStrings.join(', ')}`);
    }

    if (meta.publicMethods.length > 0) {
      parts.push(`Methods: ${meta.publicMethods.join(', ')}`);
    }

    if (dependencies.length > 0) {
      parts.push(`Deps: ${dependencies.join(', ')}`);
    }

    if (parts.length === 0) return ''; 

    // Using a distinct separator so the LLM parses it easily
    return ` -> [ ${parts.join(' ✦ ')} ]`;
  }
}

export const csharpAnalyzer = new CSharpAnalyzerService();