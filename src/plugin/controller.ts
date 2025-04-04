// Set initial window size to 400x600 pixels
figma.showUI(__html__, { width: 400, height: 600 });

async function getAllNodeDetails(node: SceneNode) {
  const details: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    relativeTransform: node.relativeTransform,
    constraints: 'constraints' in node ? node.constraints : undefined,
    fills: 'fills' in node ? node.fills : undefined,
    strokes: 'strokes' in node ? node.strokes : undefined,
    strokeWeight: 'strokeWeight' in node ? node.strokeWeight : undefined,
    cornerRadius: 'cornerRadius' in node ? node.cornerRadius : undefined,
    effects: 'effects' in node ? node.effects : undefined,
    blendMode: 'blendMode' in node ? node.blendMode : undefined,
    layoutAlign: 'layoutAlign' in node ? node.layoutAlign : undefined,
    layoutGrow: 'layoutGrow' in node ? node.layoutGrow : undefined,
    layoutMode: 'layoutMode' in node ? node.layoutMode : undefined,
    itemSpacing: 'itemSpacing' in node ? node.itemSpacing : undefined,
    boundVariables: 'boundVariables' in node ? node.boundVariables : undefined,
    visible: node.visible,
    locked: node.locked,
    absoluteTransform: node.absoluteTransform,
    absoluteBoundingBox: node.absoluteBoundingBox,
  };

  // Add properties that are only available on certain node types
  if ('opacity' in node) details.opacity = node.opacity;
  if ('rotation' in node) details.rotation = node.rotation;
  if ('absoluteRenderBounds' in node) details.absoluteRenderBounds = node.absoluteRenderBounds;
  if ('absoluteScaledBounds' in node) details.absoluteScaledBounds = node.absoluteScaledBounds;
  if ('absoluteRotation' in node) details.absoluteRotation = node.absoluteRotation;
  if ('absoluteScale' in node) details.absoluteScale = node.absoluteScale;
  if ('absoluteTranslate' in node) details.absoluteTranslate = node.absoluteTranslate;
  if ('absoluteX' in node) details.absoluteX = node.absoluteX;
  if ('absoluteY' in node) details.absoluteY = node.absoluteY;
  if ('absoluteWidth' in node) details.absoluteWidth = node.absoluteWidth;
  if ('absoluteHeight' in node) details.absoluteHeight = node.absoluteHeight;
  if ('absoluteCenterX' in node) details.absoluteCenterX = node.absoluteCenterX;
  if ('absoluteCenterY' in node) details.absoluteCenterY = node.absoluteCenterY;
  if ('absoluteTopLeft' in node) details.absoluteTopLeft = node.absoluteTopLeft;
  if ('absoluteTopRight' in node) details.absoluteTopRight = node.absoluteTopRight;
  if ('absoluteBottomLeft' in node) details.absoluteBottomLeft = node.absoluteBottomLeft;
  if ('absoluteBottomRight' in node) details.absoluteBottomRight = node.absoluteBottomRight;

  // Add text-specific properties if the node is a text node
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    
    details.textProperties = {
      characters: textNode.characters,
      fontSize: textNode.fontSize,
      fontName: textNode.fontName,
      textAlignHorizontal: textNode.textAlignHorizontal,
      textAlignVertical: textNode.textAlignVertical,
      letterSpacing: textNode.letterSpacing,
      lineHeight: textNode.lineHeight,
      textDecoration: textNode.textDecoration,
      textCase: textNode.textCase,
      paragraphIndent: textNode.paragraphIndent,
      paragraphSpacing: textNode.paragraphSpacing
    };

    // Get font token
    const variables = (textNode.boundVariables as any)?.fontName;
    if (variables) {
      console.log('Font variables:', variables); // Debug log
      const variableId = variables.id;
      if (variableId) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (variable) {
          details.textProperties.fontToken = {
            tokenName: variable.name,
            tokenType: variables.type
          };
        }
      }
    }
  }

  // Add color token information for fills and strokes
  if ('fills' in node && node.fills && Array.isArray(node.fills)) {
    const fillTokenPromises = node.fills.map(async (fill, index) => {
      if (fill.boundVariables?.color) {
        const variableId = fill.boundVariables.color.id;
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        return variable ? {
          index,
          tokenName: variable.name,
          tokenType: fill.boundVariables.color.type,
        } : undefined;
      }
      return undefined;
    });
    details.fillTokens = (await Promise.all(fillTokenPromises)).filter(Boolean);
  }

  if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
    const strokeTokenPromises = node.strokes.map(async (stroke, index) => {
      if (stroke.boundVariables?.color) {
        const variableId = stroke.boundVariables.color.id;
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        return variable ? {
          index,
          tokenName: variable.name,
          tokenType: stroke.boundVariables.color.type,
        } : undefined;
      }
      return undefined;
    });
    details.strokeTokens = (await Promise.all(strokeTokenPromises)).filter(Boolean);
  }

  // Add component-specific properties if the node is a component or instance
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const componentNode = node as ComponentNode | InstanceNode;
    details.componentProperties = {
      description: 'description' in componentNode ? componentNode.description : undefined,
      documentationLinks: 'documentationLinks' in componentNode ? componentNode.documentationLinks : undefined,
      remote: 'remote' in componentNode ? componentNode.remote : undefined,
      key: 'key' in componentNode ? componentNode.key : undefined,
    };
  }

  // Add variant-specific properties if the node is a component set
  if (node.type === 'COMPONENT_SET') {
    const componentSetNode = node as ComponentSetNode;
    details.variantProperties = {
      defaultVariant: componentSetNode.defaultVariant,
      variantGroupProperties: componentSetNode.variantGroupProperties,
      description: componentSetNode.description,
      documentationLinks: componentSetNode.documentationLinks,
      remote: componentSetNode.remote,
      key: componentSetNode.key,
    };
  }

  // Add children if the node has any
  if ('children' in node) {
    const childrenPromises = node.children.map(getAllNodeDetails);
    details.children = await Promise.all(childrenPromises);
  }

  return details;
}

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && (selection[0].type === 'FRAME' || selection[0].type === 'GROUP')) {
    figma.ui.postMessage({
      type: 'selection-change',
      name: selection[0].name,
    });
  } else {
    figma.ui.postMessage({
      type: 'selection-change',
      name: null,
    });
  }
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-rectangles') {
    const nodes = [];

    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);

    figma.ui.postMessage({
      type: 'create-rectangles',
      message: `Created ${msg.count} Rectangles`,
    });
  } else if (msg.type === 'copy-to-clipboard') {
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && (selection[0].type === 'FRAME' || selection[0].type === 'GROUP')) {
      const nodeDetails = await getAllNodeDetails(selection[0]);
      figma.ui.postMessage({
        type: 'clipboard-data',
        data: JSON.stringify(nodeDetails, null, 2),
      });
    } else {
      figma.ui.postMessage({
        type: 'clipboard-data',
        data: null,
      });
    }
  }
};
