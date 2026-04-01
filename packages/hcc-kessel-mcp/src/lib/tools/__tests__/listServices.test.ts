import { getListServicesTool } from '../listServices';
import { SERVICES } from '../../services';

describe('listServices', () => {
  it('returns all services as newline-separated text', async () => {
    const [, , tool] = getListServicesTool();
    const result = await tool({});
    expect(result.content[0].type).toBe('text');
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    const returned = text.split('\n');
    expect(returned).toEqual([...SERVICES]);
  });
});
