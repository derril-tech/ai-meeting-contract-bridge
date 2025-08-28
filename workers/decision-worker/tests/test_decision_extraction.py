import pytest
import asyncio
from unittest.mock import Mock, patch
from app.services.decision_service import DecisionService
from app.services.entity_extraction_service import EntityExtractionService


class TestDecisionExtraction:
    """Test decision extraction precision and recall"""

    @pytest.fixture
    def decision_service(self):
        return DecisionService()

    @pytest.fixture
    def entity_service(self):
        return EntityExtractionService()

    @pytest.fixture
    def sample_transcript(self):
        return """
        [00:00] Alice: Good morning everyone. Today we're discussing the NDA with TechCorp.

        [00:15] Bob: The confidentiality period should be 5 years from the date of termination.

        [00:30] Alice: Agreed. The receiving party shall not disclose confidential information to third parties without prior written consent.

        [01:00] Charlie: What about the governing law? Should we use Delaware law since we're both US companies?

        [01:15] Bob: Delaware law makes sense for intellectual property protection.

        [01:30] Alice: Also, we need to define what constitutes confidential information - technical data, business plans, customer lists.

        [02:00] David: The budget for this project is $150,000 with monthly payments of $12,500.

        [02:15] Alice: We should complete the implementation by March 31st, 2024.

        [02:30] Bob: I approve the project timeline and budget allocation.

        [02:45] Meeting concluded with agreement on all key terms.
        """

    @pytest.fixture
    def golden_decisions(self):
        return [
            {
                'type': 'obligation',
                'description': 'Maintain confidentiality for 5 years',
                'responsible_party': 'receiving party',
                'deadline': None,
                'confidence': 0.95
            },
            {
                'type': 'obligation',
                'description': 'Not disclose confidential information without consent',
                'responsible_party': 'receiving party',
                'deadline': None,
                'confidence': 0.92
            },
            {
                'type': 'deadline',
                'description': 'Complete implementation by March 31st, 2024',
                'responsible_party': 'implementation team',
                'deadline': '2024-03-31T23:59:59Z',
                'confidence': 0.88
            },
            {
                'type': 'approval',
                'description': 'Approve project timeline and budget',
                'responsible_party': 'Bob',
                'deadline': None,
                'confidence': 0.90
            }
        ]

    def test_decision_extraction_precision(self, decision_service, sample_transcript, golden_decisions):
        """Test precision of decision extraction against golden dataset"""
        speaker_turns = self._extract_speaker_turns(sample_transcript)
        entities = {}  # Would be extracted by entity service

        extracted_decisions = decision_service.extract_decisions(
            sample_transcript, speaker_turns, entities
        )

        # Calculate precision
        true_positives = 0
        false_positives = 0

        for extracted in extracted_decisions:
            matched = False
            for golden in golden_decisions:
                if self._decisions_match(extracted, golden):
                    true_positives += 1
                    matched = True
                    break
            if not matched:
                false_positives += 1

        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0

        assert precision >= 0.8  # At least 80% precision

    def test_decision_extraction_recall(self, decision_service, sample_transcript, golden_decisions):
        """Test recall of decision extraction against golden dataset"""
        speaker_turns = self._extract_speaker_turns(sample_transcript)
        entities = {}  # Would be extracted by entity service

        extracted_decisions = decision_service.extract_decisions(
            sample_transcript, speaker_turns, entities
        )

        # Calculate recall
        true_positives = 0

        for golden in golden_decisions:
            for extracted in extracted_decisions:
                if self._decisions_match(extracted, golden):
                    true_positives += 1
                    break

        recall = true_positives / len(golden_decisions)

        assert recall >= 0.9  # At least 90% recall

    def test_confidence_scoring_accuracy(self, decision_service, sample_transcript):
        """Test that confidence scores correlate with extraction accuracy"""
        speaker_turns = self._extract_speaker_turns(sample_transcript)
        entities = {}

        decisions = decision_service.extract_decisions(
            sample_transcript, speaker_turns, entities
        )

        for decision in decisions:
            confidence = decision.get('confidence', 0)

            # High confidence decisions should have clear indicators
            if confidence >= 0.9:
                assert self._has_clear_decision_indicators(decision)

            # Low confidence decisions should have ambiguous indicators
            if confidence < 0.7:
                assert self._has_ambiguous_indicators(decision)

    def test_span_provenance_accuracy(self, decision_service, sample_transcript):
        """Test that decision spans accurately reflect source text"""
        speaker_turns = self._extract_speaker_turns(sample_transcript)
        entities = {}

        decisions = decision_service.extract_decisions(
            sample_transcript, speaker_turns, entities
        )

        for decision in decisions:
            spans = decision.get('spans', [])
            for span in spans:
                # Verify span exists in original transcript
                assert span['text'] in sample_transcript
                assert span['start'] >= 0
                assert span['end'] > span['start']
                assert span['confidence'] >= 0.0
                assert span['confidence'] <= 1.0

    def _extract_speaker_turns(self, transcript):
        """Simple speaker turn extraction for testing"""
        turns = []
        lines = transcript.strip().split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Parse format: [timestamp] Speaker: text
            if '[' in line and ']' in line and ':' in line:
                try:
                    timestamp_end = line.index(']')
                    timestamp = line[1:timestamp_end]

                    colon_index = line.find(':', timestamp_end)
                    if colon_index > 0:
                        speaker = line[timestamp_end + 1:colon_index].strip()
                        text = line[colon_index + 1:].strip()

                        turns.append({
                            'speaker': speaker,
                            'text': text,
                            'timestamp': timestamp
                        })
                except:
                    continue

        return turns

    def _decisions_match(self, extracted, golden):
        """Check if extracted decision matches golden decision"""
        if extracted['type'] != golden['type']:
            return False

        # Check if key terms match
        extracted_desc = extracted['description'].lower()
        golden_desc = golden['description'].lower()

        # Simple keyword matching - in production would use more sophisticated similarity
        golden_keywords = set(golden_desc.split())
        extracted_keywords = set(extracted_desc.split())

        overlap = len(golden_keywords.intersection(extracted_keywords))
        return overlap / len(golden_keywords) >= 0.6

    def _has_clear_decision_indicators(self, decision):
        """Check if decision has clear indicators"""
        clear_indicators = [
            'shall', 'must', 'will', 'agree', 'approve', 'commit',
            'obligation', 'deadline', 'due', 'complete', 'deliver'
        ]

        description = decision.get('description', '').lower()
        return any(indicator in description for indicator in clear_indicators)

    def _has_ambiguous_indicators(self, decision):
        """Check if decision has ambiguous indicators"""
        ambiguous_indicators = [
            'maybe', 'perhaps', 'might', 'could', 'should',
            'consider', 'think', 'discuss', 'review'
        ]

        description = decision.get('description', '').lower()
        return any(indicator in description for indicator in ambiguous_indicators)


class TestEntityExtraction:
    """Test entity extraction for parties, amounts, dates"""

    @pytest.fixture
    def entity_service(self):
        return EntityExtractionService()

    @pytest.fixture
    def entity_test_cases(self):
        return [
            {
                'text': 'TechCorp and StartupXYZ agree to the NDA terms',
                'expected': {
                    'parties': ['TechCorp', 'StartupXYZ'],
                    'organizations': ['TechCorp', 'StartupXYZ']
                }
            },
            {
                'text': 'The budget is $150,000 with monthly payments of $12,500',
                'expected': {
                    'amounts': [
                        {'value': 150000, 'currency': 'USD'},
                        {'value': 12500, 'currency': 'USD'}
                    ]
                }
            },
            {
                'text': 'Complete implementation by March 31st, 2024',
                'expected': {
                    'dates': ['2024-03-31']
                }
            },
            {
                'text': 'This agreement shall be governed by Delaware law',
                'expected': {
                    'governing_law': 'Delaware law'
                }
            }
        ]

    def test_party_extraction_accuracy(self, entity_service, entity_test_cases):
        """Test accuracy of party/organization extraction"""
        for test_case in entity_test_cases:
            if 'parties' in test_case['expected']:
                entities = entity_service.extract_entities(test_case['text'])

                extracted_parties = entities.get('parties', [])
                expected_parties = test_case['expected']['parties']

                # Check that expected parties are found
                for expected_party in expected_parties:
                    assert any(expected_party.lower() in party.lower()
                             for party in extracted_parties)

    def test_amount_extraction_accuracy(self, entity_service, entity_test_cases):
        """Test accuracy of monetary amount extraction"""
        for test_case in entity_test_cases:
            if 'amounts' in test_case['expected']:
                entities = entity_service.extract_entities(test_case['text'])

                extracted_amounts = entities.get('amounts', [])
                expected_amounts = test_case['expected']['amounts']

                # Check that expected amounts are found
                for expected_amount in expected_amounts:
                    assert any(
                        abs(amount['value'] - expected_amount['value']) < 0.01 and
                        amount['currency'] == expected_amount['currency']
                        for amount in extracted_amounts
                    )

    def test_date_extraction_accuracy(self, entity_service, entity_test_cases):
        """Test accuracy of date extraction"""
        for test_case in entity_test_cases:
            if 'dates' in test_case['expected']:
                entities = entity_service.extract_entities(test_case['text'])

                extracted_dates = entities.get('dates', [])
                expected_dates = test_case['expected']['dates']

                # Check that expected dates are found
                for expected_date in expected_dates:
                    assert any(expected_date in date for date in extracted_dates)

    def test_governing_law_extraction(self, entity_service, entity_test_cases):
        """Test accuracy of governing law extraction"""
        for test_case in entity_test_cases:
            if 'governing_law' in test_case['expected']:
                entities = entity_service.extract_entities(test_case['text'])

                governing_law = entities.get('governing_law')
                expected_law = test_case['expected']['governing_law']

                assert governing_law is not None
                assert expected_law.lower() in governing_law.lower()


class TestDecisionLatency:
    """Test decision extraction performance"""

    @pytest.fixture
    def decision_service(self):
        return DecisionService()

    def test_extraction_latency_baseline(self, decision_service):
        """Test that extraction meets latency baseline"""
        import time

        test_transcript = """
        [00:00] Alice: We agree to the terms.
        [00:15] Bob: The deadline is March 31st.
        [00:30] Charlie: Budget is $100,000.
        """

        speaker_turns = [
            {'speaker': 'Alice', 'text': 'We agree to the terms.'},
            {'speaker': 'Bob', 'text': 'The deadline is March 31st.'},
            {'speaker': 'Charlie', 'text': 'Budget is $100,000.'}
        ]

        start_time = time.time()
        decisions = decision_service.extract_decisions(test_transcript, speaker_turns, {})
        end_time = time.time()

        latency = end_time - start_time

        # Should complete within reasonable time (adjust based on actual performance)
        assert latency < 5.0  # 5 seconds max

        # Should extract expected number of decisions
        assert len(decisions) >= 3

    @pytest.mark.parametrize("transcript_length", [100, 1000, 5000])
    def test_scaling_performance(self, decision_service, transcript_length):
        """Test performance scaling with transcript length"""
        # Generate test transcript of specified length
        test_transcript = self._generate_test_transcript(transcript_length)

        import time
        start_time = time.time()

        speaker_turns = [{'speaker': 'Test', 'text': test_transcript}]
        decisions = decision_service.extract_decisions(test_transcript, speaker_turns, {})

        end_time = time.time()
        latency = end_time - start_time

        # Performance should scale reasonably
        # For 5000 chars, should complete in under 10 seconds
        if transcript_length >= 5000:
            assert latency < 10.0

    def _generate_test_transcript(self, length):
        """Generate test transcript of specified length"""
        base_text = "Alice: We agree to the terms and conditions. Bob: The deadline is important. Charlie: Budget allocation required. "
        transcript = ""

        while len(transcript) < length:
            transcript += base_text

        return transcript[:length]


@pytest.mark.integration
class TestDecisionExtractionIntegration:
    """Integration tests for decision extraction pipeline"""

    @pytest.mark.asyncio
    async def test_full_decision_pipeline(self):
        """Test complete decision extraction pipeline"""
        # This would test the full integration from transcript to decisions
        pass

    @pytest.mark.asyncio
    async def test_decision_persistence(self):
        """Test that decisions are properly persisted"""
        # Test database persistence of extracted decisions
        pass

    @pytest.mark.asyncio
    async def test_concurrent_processing(self):
        """Test concurrent decision extraction"""
        # Test handling multiple transcripts simultaneously
        pass
