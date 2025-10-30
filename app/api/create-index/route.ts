import { NextResponse } from 'next/server';
import { qdrantClient } from '@/lib/qdrant';

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'tjsc-voyage-512-chunks';

/**
 * One-time API endpoint to create payload index on doc_id field
 *
 * Call this endpoint once to fix the "Bad Request: Index required" error
 * Visit: http://localhost:3000/api/create-index
 */
export async function GET() {
  try {
    console.log(`[Create Index] Checking collection: ${COLLECTION_NAME}`);

    // Step 1: Check if collection exists
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!collectionExists) {
      return NextResponse.json(
        {
          success: false,
          error: `Collection '${COLLECTION_NAME}' not found`,
          hint: 'Run the migration script first',
        },
        { status: 404 }
      );
    }

    // Step 2: Get collection info and check existing indexes
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);

    console.log('[Create Index] Existing payload schema:', collectionInfo.payload_schema);

    // Step 3: Check if doc_id index already exists
    if (collectionInfo.payload_schema?.doc_id) {
      return NextResponse.json({
        success: true,
        message: 'Index already exists on doc_id',
        indexInfo: collectionInfo.payload_schema.doc_id,
        action: 'no_action_needed',
      });
    }

    // Step 4: Create the index
    console.log('[Create Index] Creating keyword index on doc_id...');

    await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'doc_id',
      field_schema: {
        type: 'keyword',
        is_tenant: false,
        on_disk: false,
      },
      wait: true, // Wait for index creation to complete
    });

    console.log('[Create Index] Index created successfully');

    // Step 5: Verify creation
    const updatedInfo = await qdrantClient.getCollection(COLLECTION_NAME);

    return NextResponse.json({
      success: true,
      message: 'Keyword index created successfully on doc_id',
      indexInfo: updatedInfo.payload_schema?.doc_id,
      action: 'created',
      collection: COLLECTION_NAME,
    });

  } catch (error: any) {
    console.error('[Create Index] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create index',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
