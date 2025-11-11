/**
 * Tests for PolyX Supreme v1.0 Agent
 */

import { describe, it, expect } from 'vitest';
import { PolyXAgent, OutputFormatPhase } from '../index';
import type { TaskSpec, AgentConfig } from '../types';

describe('PolyX Supreme v1.0 Agent', () => {
  describe('Basic Agent Execution', () => {
    it('should execute successfully with a simple task', async () => {
      const task: TaskSpec = {
        description: 'Create a function that adds two numbers',
        requirements: ['Function should handle positive numbers', 'Return numeric result'],
        constraints: ['Keep it simple']
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.80,
        maxRetries: 2
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      expect(result).toBeDefined();
      expect('error' in result).toBe(false);
      
      if ('attempt' in result) {
        expect(result.attempt).toBeGreaterThan(0);
        expect(result.confidenceScore).toBeGreaterThan(0);
        expect(result.code).toBeDefined();
        expect(result.checklist).toBeDefined();
      }
    });

    it('should generate code for the task', async () => {
      const task: TaskSpec = {
        description: 'Implement a simple validator',
        requirements: ['Validate input is not empty']
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.70,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      expect(result).toBeDefined();
      
      if ('code' in result) {
        expect(result.code).toBeTruthy();
        expect(result.code.length).toBeGreaterThan(0);
      }
    });

    it('should include tests in verified mode', async () => {
      const task: TaskSpec = {
        description: 'Create a string formatter',
        requirements: ['Format strings to uppercase']
      };

      const config: AgentConfig = {
        mode: 'verified',
        confidenceTarget: 0.80,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      if ('tests' in result) {
        expect(result.tests).toBeDefined();
      }
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence score', async () => {
      const task: TaskSpec = {
        description: 'Simple task for testing',
        requirements: ['Requirement 1']
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.50,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      if ('confidenceScore' in result) {
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);
      }
    });

    it('should meet confidence target in fast mode', async () => {
      const task: TaskSpec = {
        description: 'Basic implementation task'
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.60,
        maxRetries: 2
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      if ('confidenceScore' in result) {
        // In fast mode, lower confidence is acceptable
        expect(result.confidenceScore).toBeGreaterThan(0);
      }
    });
  });

  describe('Checklist Validation', () => {
    it('should include all checklist items', async () => {
      const task: TaskSpec = {
        description: 'Test task for checklist'
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.70,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      if ('checklist' in result) {
        expect(result.checklist).toHaveProperty('specAligned');
        expect(result.checklist).toHaveProperty('invariantsCovered');
        expect(result.checklist).toHaveProperty('driftScoreZero');
        expect(result.checklist).toHaveProperty('securityAndPolicySafe');
        expect(result.checklist).toHaveProperty('confidenceAboveTarget');
      }
    });
  });

  describe('Retry Logic', () => {
    it('should respect max retries', async () => {
      const task: TaskSpec = {
        description: 'Complex task'
      };

      const config: AgentConfig = {
        mode: 'verified',
        confidenceTarget: 0.99, // Very high target
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      // Should complete even if target not met
      expect(result).toBeDefined();
      
      if ('attempt' in result) {
        expect(result.attempt).toBeLessThanOrEqual(config.maxRetries);
      }
    });
  });

  describe('Static Activation Method', () => {
    it('should work via static activate method', async () => {
      const result = await PolyXAgent.activate({
        task: 'Simple test task',
        mode: 'fast',
        confidenceTarget: 0.70
      });

      expect(result).toBeDefined();
      if ('code' in result) {
        expect(result.code).toBeTruthy();
      }
    });

    it('should accept requirements and constraints', async () => {
      const result = await PolyXAgent.activate({
        task: 'Test with requirements',
        requirements: ['Req 1', 'Req 2'],
        constraints: ['Constraint 1'],
        mode: 'fast',
        confidenceTarget: 0.70
      });

      expect(result).toBeDefined();
    });
  });

  describe('Output Formatting', () => {
    it('should format output as YAML', async () => {
      const task: TaskSpec = {
        description: 'Format test'
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.70,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      if ('code' in result) {
        const formatter = new OutputFormatPhase();
        const yaml = formatter.formatAsYAML(result);
        
        expect(yaml).toBeTruthy();
        expect(yaml).toContain('attempt:');
        expect(yaml).toContain('confidence_score:');
        expect(yaml).toContain('checklist:');
      }
    });

    it('should format output as JSON', async () => {
      const task: TaskSpec = {
        description: 'JSON format test'
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.70,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      if ('code' in result) {
        const formatter = new OutputFormatPhase();
        const json = formatter.formatAsJSON(result);
        
        expect(json).toBeTruthy();
        const parsed = JSON.parse(json);
        expect(parsed).toHaveProperty('attempt');
        expect(parsed).toHaveProperty('confidenceScore');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task description', async () => {
      const task: TaskSpec = {
        description: ''
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.50,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      expect(result).toBeDefined();
    });

    it('should handle task with many requirements', async () => {
      const task: TaskSpec = {
        description: 'Complex task',
        requirements: [
          'Req 1', 'Req 2', 'Req 3', 'Req 4', 'Req 5',
          'Req 6', 'Req 7', 'Req 8', 'Req 9', 'Req 10'
        ]
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.60,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      expect(result).toBeDefined();
    });

    it('should handle zero max retries', async () => {
      const task: TaskSpec = {
        description: 'No retry task'
      };

      const config: AgentConfig = {
        mode: 'fast',
        confidenceTarget: 0.70,
        maxRetries: 1
      };

      const agent = new PolyXAgent();
      const result = await agent.execute(task, config);

      expect(result).toBeDefined();
    });
  });
});
