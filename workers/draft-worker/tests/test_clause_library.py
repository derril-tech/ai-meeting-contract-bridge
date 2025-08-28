import pytest
import asyncio
from unittest.mock import Mock, patch
from app.services.clause_service import ClauseService
from app.services.draft_service import DraftService


class TestClauseLibrary:
    """Test clause library functionality and golden set mappings"""

    @pytest.fixture
    def clause_service(self):
        return ClauseService()

    @pytest.fixture
    def draft_service(self):
        return DraftService()

    @pytest.fixture
    def golden_decision_draft_mappings(self):
        """Golden dataset mapping decisions to expected clauses and placeholders"""
        return [
            {
                'decisions': [
                    {
                        'type': 'obligation',
                        'description': 'Maintain confidentiality for 5 years',
                        'responsible_party': 'receiving party',
                        'confidence': 0.95
                    }
                ],
                'contract_type': 'nda',
                'jurisdiction': 'US',
                'expected_clauses': [
                    'confidentiality_period',
                    'confidential_information_definition',
                    'non_disclosure_obligation'
                ],
                'expected_placeholders': [
                    {'name': 'confidentiality_period', 'type': 'string', 'required': True},
                    {'name': 'receiving_party', 'type': 'party', 'required': True},
                    {'name': 'effective_date', 'type': 'date', 'required': True}
                ],
                'expected_deviations': []
            },
            {
                'decisions': [
                    {
                        'type': 'obligation',
                        'description': 'Not disclose confidential information without consent',
                        'responsible_party': 'receiving party',
                        'confidence': 0.92
                    }
                ],
                'contract_type': 'nda',
                'jurisdiction': 'UK',
                'expected_clauses': [
                    'non_disclosure_obligation',
                    'permitted_disclosures',
                    'return_of_materials'
                ],
                'expected_placeholders': [
                    {'name': 'receiving_party', 'type': 'party', 'required': True},
                    {'name': 'disclosing_party', 'type': 'party', 'required': True}
                ],
                'expected_deviations': [
                    {
                        'type': 'jurisdiction_specific',
                        'description': 'UK-specific disclosure requirements',
                        'risk': 'medium'
                    }
                ]
            },
            {
                'decisions': [
                    {
                        'type': 'deadline',
                        'description': 'Complete implementation by March 31st, 2024',
                        'responsible_party': 'implementation team',
                        'deadline': '2024-03-31T23:59:59Z',
                        'confidence': 0.88
                    },
                    {
                        'type': 'obligation',
                        'description': 'Deliver software according to specifications',
                        'responsible_party': 'vendor',
                        'confidence': 0.90
                    }
                ],
                'contract_type': 'sow',
                'jurisdiction': 'US',
                'expected_clauses': [
                    'scope_of_work',
                    'deliverables',
                    'timeline_and_milestones',
                    'acceptance_criteria',
                    'change_management'
                ],
                'expected_placeholders': [
                    {'name': 'project_description', 'type': 'string', 'required': True},
                    {'name': 'deliverables_list', 'type': 'string', 'required': True},
                    {'name': 'completion_date', 'type': 'date', 'required': True},
                    {'name': 'acceptance_criteria', 'type': 'string', 'required': True}
                ],
                'expected_deviations': []
            }
        ]

    def test_clause_retrieval_accuracy(self, clause_service, golden_decision_draft_mappings):
        """Test that correct clauses are retrieved for given decisions"""
        for mapping in golden_decision_draft_mappings:
            clauses = clause_service.retrieve_clauses(
                contract_type=mapping['contract_type'],
                jurisdiction=mapping['jurisdiction'],
                decisions=mapping['decisions'],
                entities={}
            )

            # Check that expected clauses are included
            retrieved_clause_ids = [clause['id'] for clause in clauses]
            for expected_clause in mapping['expected_clauses']:
                assert any(expected_clause in clause_id for clause_id in retrieved_clause_ids)

    def test_placeholder_identification(self, draft_service, golden_decision_draft_mappings):
        """Test that correct placeholders are identified"""
        for mapping in golden_decision_draft_mappings:
            # Simulate draft content
            draft_content = self._generate_mock_draft_content(mapping)

            placeholders = draft_service.identify_placeholders(draft_content)

            # Check that expected placeholders are identified
            placeholder_names = [p['name'] for p in placeholders]
            for expected_placeholder in mapping['expected_placeholders']:
                assert expected_placeholder['name'] in placeholder_names

                # Check placeholder properties
                placeholder = placeholders.find(p => p.name === expected_placeholder['name'])
                assert placeholder['type'] === expected_placeholder['type']
                assert placeholder['required'] === expected_placeholder['required']

    def test_deviation_detection(self, draft_service, golden_decision_draft_mappings):
        """Test that deviations from standard templates are detected"""
        for mapping in golden_decision_draft_mappings:
            clauses = [
                {'id': clause_id, 'category': 'general'}
                for clause_id in mapping['expected_clauses']
            ]

            deviations = draft_service.identify_deviations(clauses, mapping['contract_type'])

            # Check expected deviations
            deviation_types = [d['type'] for d in deviations]
            for expected_deviation in mapping['expected_deviations']:
                assert expected_deviation['type'] in deviation_types

                # Check deviation properties
                deviation = deviations.find(d => d.type === expected_deviation['type'])
                assert deviation['description'] === expected_deviation['description']
                assert deviation['risk'] === expected_deviation['risk']

    def test_jurisdiction_specific_clauses(self, clause_service):
        """Test retrieval of jurisdiction-specific clauses"""
        test_cases = [
            {
                'contract_type': 'nda',
                'jurisdiction': 'US',
                'expected_categories': ['confidentiality', 'governing_law']
            },
            {
                'contract_type': 'nda',
                'jurisdiction': 'UK',
                'expected_categories': ['confidentiality', 'data_protection', 'governing_law']
            },
            {
                'contract_type': 'nda',
                'jurisdiction': 'EU',
                'expected_categories': ['confidentiality', 'gdpr_compliance', 'governing_law']
            }
        ]

        for test_case in test_cases:
            clauses = clause_service.retrieve_clauses(
                contract_type=test_case['contract_type'],
                jurisdiction=test_case['jurisdiction'],
                decisions=[],
                entities={}
            )

            clause_categories = list(set([clause['category'] for clause in clauses]))
            for expected_category in test_case['expected_categories']:
                assert expected_category in clause_categories

    def test_contract_type_specific_clauses(self, clause_service):
        """Test retrieval of contract type-specific clauses"""
        test_cases = [
            {
                'contract_type': 'nda',
                'expected_categories': ['confidentiality', 'non_disclosure', 'term_and_termination']
            },
            {
                'contract_type': 'sow',
                'expected_categories': ['scope_of_work', 'deliverables', 'timeline', 'payment_terms']
            },
            {
                'contract_type': 'mou',
                'expected_categories': ['objectives', 'term_and_termination', 'governing_law']
            }
        ]

        for test_case in test_cases:
            clauses = clause_service.retrieve_clauses(
                contract_type=test_case['contract_type'],
                jurisdiction='US',
                decisions=[],
                entities={}
            )

            clause_categories = list(set([clause['category'] for clause in clauses]))
            for expected_category in test_case['expected_categories']:
                assert expected_category in clause_categories

    def _generate_mock_draft_content(self, mapping):
        """Generate mock draft content for testing"""
        content = f"This is a {mapping['contract_type'].upper()} agreement.\n\n"

        for clause_id in mapping['expected_clauses']:
            content += f"{clause_id.replace('_', ' ').title()} Clause:\n"
            content += "Sample clause text here.\n\n"

        # Add placeholders
        for placeholder in mapping['expected_placeholders']:
            content += f"{{{{{placeholder['name']}}}}}\n"

        return content


class TestDraftGeneration:
    """Test draft generation quality and completeness"""

    @pytest.fixture
    def draft_service(self):
        return DraftService()

    @pytest.fixture
    def clause_service(self):
        return ClauseService()

    def test_draft_completeness(self, draft_service, clause_service):
        """Test that generated drafts include all necessary sections"""
        test_cases = [
            {
                'contract_type': 'nda',
                'decisions': [
                    {'type': 'obligation', 'description': 'Keep information confidential'},
                    {'type': 'deadline', 'description': '5 year term'}
                ],
                'required_sections': [
                    'parties', 'confidential_information', 'obligations',
                    'term', 'governing_law', 'signatures'
                ]
            },
            {
                'contract_type': 'sow',
                'decisions': [
                    {'type': 'obligation', 'description': 'Deliver software'},
                    {'type': 'deadline', 'description': 'Complete by Q2'}
                ],
                'required_sections': [
                    'parties', 'scope_of_work', 'deliverables', 'timeline',
                    'payment_terms', 'acceptance_criteria', 'termination'
                ]
            }
        ]

        for test_case in test_cases:
            clauses = clause_service.retrieve_clauses(
                contract_type=test_case['contract_type'],
                jurisdiction='US',
                decisions=test_case['decisions'],
                entities={}
            )

            draft_content = draft_service.generate_draft(
                contract_type=test_case['contract_type'],
                clauses=clauses,
                decisions=test_case['decisions'],
                entities={}
            )

            # Check that all required sections are present
            for section in test_case['required_sections']:
                assert section.replace('_', ' ').lower() in draft_content.lower()

    def test_placeholder_coverage(self, draft_service):
        """Test that all required placeholders are present in generated drafts"""
        decisions = [
            {'type': 'obligation', 'description': 'Party A will deliver services'},
            {'type': 'deadline', 'description': 'Complete by March 31, 2024'}
        ]

        clauses = [
            {'id': 'parties', 'text': 'This agreement is between {{{party_a}}} and {{{party_b}}}'},
            {'id': 'deadline', 'text': 'Work will be completed by {{{completion_date}}}'}
        ]

        draft_content = draft_service.generate_draft(
            contract_type='sow',
            clauses=clauses,
            decisions=decisions,
            entities={}
        )

        # Check that placeholders are present
        assert '{{{party_a}}}' in draft_content
        assert '{{{party_b}}}' in draft_content
        assert '{{{completion_date}}}' in draft_content

    def test_decision_to_clause_mapping(self, draft_service, clause_service):
        """Test that decisions are properly mapped to appropriate clauses"""
        decision_clause_mappings = {
            'obligation': ['non_disclosure_obligation', 'performance_obligation'],
            'deadline': ['timeline', 'term_and_termination'],
            'approval': ['governing_law', 'execution'],
            'deliverable': ['deliverables', 'scope_of_work']
        }

        for decision_type, expected_clauses in decision_clause_mappings.items():
            decisions = [
                {
                    'type': decision_type,
                    'description': f'Test {decision_type}',
                    'confidence': 0.9
                }
            ]

            clauses = clause_service.retrieve_clauses(
                contract_type='nda',
                jurisdiction='US',
                decisions=decisions,
                entities={}
            )

            # Check that relevant clauses are included
            clause_ids = [clause['id'] for clause in clauses]
            for expected_clause in expected_clauses:
                assert any(expected_clause in clause_id for clause_id in clause_ids)


class TestDraftQuality:
    """Test draft quality metrics"""

    @pytest.fixture
    def draft_service(self):
        return DraftService()

    def test_readability_score(self, draft_service):
        """Test that generated drafts meet readability standards"""
        test_draft = """
        This Agreement is entered into on the Effective Date by and between Party A and Party B.

        1. Definitions
        "Confidential Information" means any information disclosed by Disclosing Party to Receiving Party.

        2. Obligations
        Receiving Party shall maintain the confidentiality of Confidential Information.

        3. Term
        This Agreement shall remain in effect for a period of five (5) years.

        4. Governing Law
        This Agreement shall be governed by the laws of the State of Delaware.
        """

        readability_score = draft_service.calculate_readability_score(test_draft)

        # Flesch reading ease score (higher is easier to read)
        assert readability_score >= 30  # At least moderately readable

    def test_contract_completeness_score(self, draft_service):
        """Test contract completeness against standard checklist"""
        complete_draft = """
        RECITALS
        This Agreement is made between Company A and Company B.

        1. DEFINITIONS
        "Agreement" means this Non-Disclosure Agreement.

        2. CONFIDENTIAL INFORMATION
        Confidential Information includes technical data, business plans.

        3. OBLIGATIONS
        Receiving Party shall protect Confidential Information.

        4. TERM
        This Agreement expires 5 years from the Effective Date.

        5. GOVERNING LAW
        Governed by Delaware law.

        6. MISCELLANEOUS
        Entire agreement, amendments in writing.

        SIGNATURES
        Company A: ____________________
        Company B: ____________________
        """

        completeness_score = draft_service.calculate_completeness_score(complete_draft, 'nda')

        assert completeness_score >= 0.8  # At least 80% complete

    def test_placeholder_resolution_rate(self, draft_service):
        """Test that placeholders can be resolved from decision data"""
        decisions = [
            {
                'type': 'obligation',
                'description': 'TechCorp will maintain confidentiality',
                'responsible_party': 'TechCorp',
                'confidence': 0.9
            }
        ]

        entities = {
            'parties': ['TechCorp', 'StartupXYZ'],
            'dates': ['2024-01-01']
        }

        draft_content = """
        This agreement is between {{{party_a}}} and {{{party_b}}}.
        {{{party_a}}} shall maintain confidentiality.
        Effective date: {{{effective_date}}}.
        """

        resolved_content = draft_service.resolve_placeholders(
            draft_content, decisions, entities
        )

        # Check that placeholders were resolved
        assert 'TechCorp' in resolved_content
        assert 'StartupXYZ' in resolved_content
        assert '2024-01-01' in resolved_content
        assert '{{{' not in resolved_content  # No unresolved placeholders


@pytest.mark.integration
class TestClauseLibraryIntegration:
    """Integration tests for clause library"""

    @pytest.mark.asyncio
    async def test_clause_versioning(self):
        """Test clause versioning and updates"""
        # Test that clause updates don't break existing drafts
        pass

    @pytest.mark.asyncio
    async def test_jurisdiction_coverage(self):
        """Test coverage across different jurisdictions"""
        # Test clause availability for different jurisdictions
        pass

    @pytest.mark.asyncio
    async def test_performance_under_load(self):
        """Test clause retrieval performance with many clauses"""
        # Performance test for large clause libraries
        pass
