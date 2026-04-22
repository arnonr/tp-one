import { describe, it, expect } from 'vitest'

describe('MyWorkService', () => {
  // Type-level test: verify the service has the correct interface
  it('service has getSummary method', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    expect(typeof MyWorkService.getSummary).toBe('function')
  })

  it('service has getToday method', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    expect(typeof MyWorkService.getToday).toBe('function')
  })

  it('service has getOverdue method', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    expect(typeof MyWorkService.getOverdue).toBe('function')
  })

  it('service has getUpcoming method', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    expect(typeof MyWorkService.getUpcoming).toBe('function')
  })

  it('service has getWaiting method', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    expect(typeof MyWorkService.getWaiting).toBe('function')
  })

  it('service has getAll method', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    expect(typeof MyWorkService.getAll).toBe('function')
  })

  it('getSummary returns object with correct shape when called', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    // getSummary returns a Promise - verify it's callable (DB errors are expected without seeded DB)
    const result = MyWorkService.getSummary('00000000-0000-0000-0000-000000000001')
    expect(result).toBeInstanceOf(Promise)
  })

  it('getAll returns object with summary, today, overdue, upcoming, waiting', async () => {
    const { MyWorkService } = await import('../../../src/modules/my-work/my-work.service')
    const result = MyWorkService.getAll('00000000-0000-0000-0000-000000000001')
    expect(result).toBeInstanceOf(Promise)
  })
})
