export interface NixwareApi {
    globals: {
        [key: string]: any;
    };
    classes: {
        [key: string]: NixwareClass;
    };
}

export interface NixwareClass {
    name: string;
    methods: NixwareMethod[];
    properties: NixwareProperty[];
}

export interface NixwareMethod {
    name: string;
    parameters: NixwareParameter[];
    returnType: string;
    description: string;
}

export interface NixwareParameter {
    name: string;
    type: string;
    description: string;
    optional?: boolean;
}

export interface NixwareProperty {
    name: string;
    type: string;
    description: string;
}

export interface LuaFunction {
    name: string;
    description: string;
    parameters?: Parameter[];
    returns?: Return[];
}

export interface Parameter {
    name: string;
    type: string;
    description: string;
    optional?: boolean;
}

export interface Return {
    type: string;
    description: string;
} 